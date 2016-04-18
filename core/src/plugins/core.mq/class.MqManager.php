<?php
/*
 * Copyright 2007-2012 Charles du Jeu <contact (at) cdujeu.me>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <http://pyd.io/>.
 */

use Devristo\Phpws\Client\WebSocket;
use Zend\Log\Logger;

defined('AJXP_EXEC') or die( 'Access not allowed');

require_once(__DIR__ . '/vendor/autoload.php');

/*
 * @package AjaXplorer_Plugins
 * @subpackage Core
 *
 */
class MqManager extends AJXP_Plugin
{

    private $wsClient;
    private $loop;
    /**
     * @var AJXP_MessageExchanger;
     */
    private $msgExchanger = false;
    private $useQueue = false ;

    /**
     * @param $options
     */
    public function init($options)
    {
        parent::init($options);
        $this->useQueue = $this->pluginConf["USE_QUEUE"];
        try {
            $this->msgExchanger = ConfService::instanciatePluginFromGlobalParams($this->pluginConf["UNIQUE_MS_INSTANCE"], "AJXP_MessageExchanger");
            if(AuthService::$bufferedMessage != null && AuthService::getLoggedUser() != null){
                $this->sendInstantMessage(AuthService::$bufferedMessage, ConfService::getCurrentRepositoryId(), AuthService::getLoggedUser()->getId());
                AuthService::$bufferedMessage = null;
            }
        } catch (Exception $e) {}

        $this->exposeConfigInManifest("WS_SERVER_TYPE",  $this->pluginConf["WS_SERVER_TYPE"]["server"]);
    }

    /**
     * @param AJXP_Notification $notification
     */
    public function sendToQueue(AJXP_Notification $notification)
    {
        if (!$this->useQueue) {
            $this->logDebug("SHOULD DISPATCH NOTIFICATION ON ".$notification->getNode()->getUrl()." ACTION ".$notification->getAction());
            AJXP_Controller::applyHook("msg.notification", array(&$notification));
        } else {
            if($this->msgExchanger) $this->msgExchanger->publishWorkerMessage("user_notifications", $notification);
        }
    }

    /**
     * @param $action
     * @param $httpVars
     * @param $fileVars
     */
    public function consumeQueue($action, $httpVars, $fileVars)
    {
        if($action != "consume_notification_queue" || $this->msgExchanger === false) return;
        $queueObjects = $this->msgExchanger->consumeWorkerChannel("user_notifications");
        if (is_array($queueObjects)) {
            $this->logDebug("Processing notification queue, ".count($queueObjects)." notifs to handle");
            foreach ($queueObjects as $notification) {
                AJXP_Controller::applyHook("msg.notification", array(&$notification));
            }
        }
    }

    /**
     * @param AJXP_Node $origNode
     * @param AJXP_Node $newNode
     * @param bool $copy
     */
    public function publishNodeChange($origNode = null, $newNode = null, $copy = false)
    {
        $content = "";$repo = "";$targetUserId=null; $nodePathes = array();
        $update = false;

        if ($newNode != null) {
            $repo = $newNode->getRepositoryId();
            $targetUserId = $newNode->getUser();
            $nodePathes[] = $newNode->getPath();
            $update = false;
            $data = array();
            if ($origNode != null && !$copy) {
                $update = true;
                $data[$origNode->getPath()] = $newNode;
            } else {
                $data[] = $newNode;
            }
            $content = AJXP_XMLWriter::writeNodesDiff(array(($update?"UPDATE":"ADD") => $data));
        }

        if ($origNode != null && ! $update && !$copy) {

            $repo = $origNode->getRepositoryId();
            $targetUserId = $origNode->getUser();
            $nodePathes[] = $origNode->getPath();
            $content = AJXP_XMLWriter::writeNodesDiff(array("REMOVE" => array($origNode->getPath())));

        }

        if (!empty($content) && $repo != "") {
            $this->sendInstantMessage($content, $repo, $targetUserId, null, $nodePathes);
        }
    }

    /**
     * @param $xmlContent
     * @param $repositoryId
     * @param null $targetUserId
     * @param null $targetGroupPath
     * @param array $nodePathes
     */
    public function sendInstantMessage($xmlContent, $repositoryId, $targetUserId = null, $targetGroupPath = null, $nodePathes = array())
    {
        if ($repositoryId === AJXP_REPO_SCOPE_ALL) {
            $userId = $targetUserId;
        } else {
            $repo = ConfService::getRepositoryById($repositoryId);
            $scope = !empty($repo) ? $repo->securityScope() : null;
            $user  = AuthService::getLoggedUser();

            if ($scope == "USER" && (!empty($user))){
                $userId = $user->getId();
            } else if ($scope == "GROUP" && (!empty($user)) )  {
                $gPath = AuthService::getLoggedUser()->getGroupPath();
            } else if (isSet($targetUserId)) {
                $userId = $targetUserId;
            } else if (isSet($targetGroupPath)) {
                $gPath = $targetGroupPath;
            }
        }

        // Publish for pollers
        $message = new stdClass();
        $message->content = $xmlContent;

        if(isSet($userId)) {
            $message->userId = $userId;
        }
        if(isSet($gPath)) {
            $message->groupPath = $gPath;
        }
        if(count($nodePathes)) {
            $message->nodePathes = $nodePathes;
        }

        if ($this->msgExchanger) {
            $this->msgExchanger->publishInstantMessage("nodes:$repositoryId", $message);
        }

        // Publish for WebSockets
        $configs = $this->getConfigs();
        if ($configs["WS_SERVER_ACTIVE"]) {
            // Publish for websockets
            $input = array("REPO_ID" => $repositoryId, "CONTENT" => "<tree>".$xmlContent."</tree>");
            if(isSet($userId)){
                $input["USER_ID"] = $userId;
            } else if(isSet($gPath)) {
                $input["GROUP_PATH"] = $gPath;
            }
            if(count($nodePathes)) {
                $input["NODE_PATHES"] = $nodePathes;
            }

            // WS via NPM
            switch ($configs["WS_SERVER_TYPE"]["server"]) {
                case "npm":
                    $url = "http://" . $configs["WS_SERVER_BIND_HOST"] . ":" . $configs["WS_SERVER_BIND_PORT"];

                    $httpContext = [
                        'header' => [
                            'Admin-Key: ' . $configs["WS_SERVER_ADMIN"]
                        ]
                    ];

                    $this->wsClient = new ElephantIO\Client(
                        new ElephantIO\Engine\SocketIO\Version1X($url, ['context' => [
                            'http' => $httpContext
                        ]])
                    );

                    $namespace = $configs["WS_SERVER_ADMIN_PATH"];
                    $this->wsClient->initialize();

                    $this->wsClient->of($namespace);

                    $this->wsClient->emit('message', [
                        'repoId' => $repositoryId,
                        'message' => json_encode($input)
                    ]);
                    $this->wsClient->close();

                    break;

                case "php-ws":
                default:

                    // little workaround,... it seems phpws cannot resolv ip for localhost ? :-)
                    if($configs['WS_SERVER_BIND_HOST'] == 'localhost') $configs['WS_SERVER_BIND_HOST']  = '127.0.0.1';

                    $loop = \React\EventLoop\Factory::create();
                    $logger = new \Zend\Log\Logger();

                    if (AJXP_SERVER_DEBUG) {
                        $writer = new Zend\Log\Writer\Stream("php://output");
                    }else {
                        $writer = new Zend\Log\Writer\Noop;
                    }

                    $logger->addWriter($writer);

                    $url = "ws://" . $configs["WS_SERVER_BIND_HOST"] . ":" . $configs["WS_SERVER_BIND_PORT"] . $configs["WS_SERVER_ADMIN_PATH"];

                    $wsClient = new \Devristo\Phpws\Client\WebSocket($url, $loop, $logger);

                    $msg = new \Devristo\Phpws\Messaging\WebSocketMessage();
                    $msg->setData(json_encode([
                        'repoId' => $repositoryId,
                        'message' => $input
                    ]));

                    $wsClient->on("connect", function () use ($logger, $wsClient, $msg, $loop) {
                        $wsClient->sendMessage($msg);
                    });

                    $wsClient->on("request", function ($handshake) use ($logger, $configs) {
                        $handshake->getHeaders()->addHeaderLine("Admin-Key", $configs["WS_SERVER_ADMIN"]);
                    });

                    $wsClient->open();
                    $loop->run();

                    $this->wsClient = $wsClient;
                    $this->loop = $loop;

                    break;
            }
        }
    }

    /**
     * @param $action
     * @param $httpVars
     * @param $fileVars
     *
     */
    public function clientChannelMethod($action, $httpVars, $fileVars)
    {
        if(!$this->msgExchanger) return;
        switch ($action) {
            case "client_register_channel":
                $this->msgExchanger->suscribeToChannel($httpVars["channel"], $httpVars["client_id"]);
                break;
            case "client_unregister_channel":
                $this->msgExchanger->unsuscribeFromChannel($httpVars["channel"], $httpVars["client_id"]);
                break;
            case "client_consume_channel":
                if (AuthService::usersEnabled()) {
                    $user = AuthService::getLoggedUser();
                    if ($user == null) {
                        AJXP_XMLWriter::header();
                        AJXP_XMLWriter::requireAuth();
                        AJXP_XMLWriter::close();
                        return;
                    }
                    $GROUP_PATH = $user->getGroupPath();
                    if($GROUP_PATH == null) $GROUP_PATH = false;
                    $uId = $user->getId();
                } else {
                    $GROUP_PATH = '/';
                    $uId = 'shared';
                }
                $currentRepository = ConfService::getCurrentRepositoryId();
                $currentRepoMasks = array(); $regexp = null;
                AJXP_Controller::applyHook("role.masks", array($currentRepository, &$currentRepoMasks, AJXP_Permission::READ));
                if(count($currentRepoMasks)){
                    $regexps = array();
                    foreach($currentRepoMasks as $path){
                        $regexps[] = '^'.preg_quote($path, '/');
                    }
                    $regexp = '/'.implode("|", $regexps).'/';
                }
                $channelRepository = str_replace("nodes:", "", $httpVars["channel"]);
                if($channelRepository != $currentRepository){
                    AJXP_XMLWriter::header();
                    echo "<require_registry_reload repositoryId=\"$currentRepository\"/>";
                    AJXP_XMLWriter::close();
                    return;
                }

                $data = $this->msgExchanger->consumeInstantChannel($httpVars["channel"], $httpVars["client_id"], $uId, $GROUP_PATH);
                if (count($data)) {
                   AJXP_XMLWriter::header();
                   ksort($data);
                   foreach ($data as $messageObject) {
                       if(isSet($regexp) && isSet($messageObject->nodePathes)){
                           $pathIncluded = false;
                           foreach($messageObject->nodePathes as $nodePath){
                               if(preg_match($regexp, $nodePath)){
                                   $pathIncluded = true;
                                   break;
                               }
                           }
                           if(!$pathIncluded) continue;
                       }
                       echo $messageObject->content;
                   }
                   AJXP_XMLWriter::close();
                }

                break;
            default:
                break;
        }
    }

    /**
     * @param $action
     * @param $httpVars
     * @param $fileVars
     * @throws Exception
     */
    public function wsAuthenticate($action, $httpVars, $fileVars)
    {
        $user = AuthService::getLoggedUser();
        if ($user == null) {
            $this->logDebug("Error Authenticating through WebSocket (not logged)");
            throw new Exception("You must be logged in");
        }
        $xml = AJXP_XMLWriter::getUserXML($user);
        // add groupPath
        if ($user->getGroupPath() != null) {
            $groupString = "groupPath=\"".AJXP_Utils::xmlEntities($user->getGroupPath())."\"";
            $xml = str_replace("<user id=", "<user {$groupString} id=", $xml);
        }

        $this->logDebug("Authenticating user ".$user->id." through WebSocket");
        AJXP_XMLWriter::header();
        echo $xml;
        AJXP_XMLWriter::close();
    }

    /**
     * @param $params
     * @return string
     * @throws Exception
     */
    public function switchWebSocketOn($params)
    {
        $wDir = $this->getPluginWorkDir(true);
        $pidFile = $wDir.DIRECTORY_SEPARATOR."ws-pid";
        if (file_exists($pidFile)) {
            $pId = file_get_contents($pidFile);
            $unixProcess = new UnixProcess();
            $unixProcess->setPid($pId);
            $status = $unixProcess->status();
            if ($status) {
                throw new Exception("Web Socket server seems to already be running!");
            }
        }

        $cmd = $this->getWebSocketStartCmd($params);

        //return $cmd;
        $process = AJXP_Controller::runCommandInBackground($cmd, '/tmp/debug.out');

        // For the last command, (the one that starts the server), save the process pid
        if ($process != null) {
            $pId = $process->getPid();
            $wDir = $this->getPluginWorkDir(true);
            file_put_contents($wDir.DIRECTORY_SEPARATOR."ws-pid", $pId);
            return "SUCCESS: Started WebSocket Server with process ID $pId";
        }
        return "SUCCESS: Started WebSocket Server";
    }


    /**
     * @param $params
     * @return string
     * @throws Exception
     */
    public function switchWebSocketOff($params)
    {
        $wDir = $this->getPluginWorkDir(true);
        $pidFile = $wDir.DIRECTORY_SEPARATOR."ws-pid";
        if (!file_exists($pidFile)) {
            throw new Exception("No information found about WebSocket server");
        } else {
            $pId = file_get_contents($pidFile);
            $unixProcess = new UnixProcess();
            $unixProcess->setPid($pId);
            $unixProcess->stop();
            unlink($pidFile);
        }
        return "SUCCESS: Killed WebSocket Server";
    }

    /**
     * @param $params
     * @return string
     */
    public function getWebSocketStartCmd($params)
    {
        // Default to saved config
        $params += $this->pluginConf;

        $serverType = !empty($params["WS_SERVER_TYPE"]['server']) ? $params["WS_SERVER_TYPE"]['server'] : $params["server"];

        $publicPort = $params["WS_SERVER_PORT"];
        $publicPath = escapeshellarg($params["WS_SERVER_PATH"]);

        $privatePort = $params["WS_SERVER_BIND_PORT"];
        $privatePath = escapeshellarg($params["WS_SERVER_ADMIN_PATH"]);

        $adminKey = $params["WS_SERVER_ADMIN"];

        $prefix = AJXP_INSTALL_PATH.DIRECTORY_SEPARATOR.AJXP_PLUGINS_FOLDER.DIRECTORY_SEPARATOR."core.mq";

        $args = "";
        $args .= (isset($privatePort) ? " --private-port=" . $privatePort : "");
        $args .= (isset($privatePath) ? " --private-path=" . $privatePath : "");
        $args .= (isset($publicPort) ? " --public-port=" . $publicPort : "");
        $args .= (isset($publicPath) ? " --public-path=" . $publicPath : "");
        $args .= " --key=" . hash_hmac("md5", $adminKey, "Pydi0W3bS0ck3!");

        switch ($serverType) {
            case "npm" :
                $cmd = ConfService::getCoreConf("CLI_NPM") . " start --prefix " . $prefix . " " . $args;

                break;
            default:
                $cmd = ConfService::getCoreConf("CLI_PHP") . " " . $prefix . DIRECTORY_SEPARATOR . "ws-server.php " . $args;

                break;
        }

        return $cmd;
    }

    /**
     * @param $params
     * @return string
     */
    public function getWebSocketStatus($params)
    {
        $params += $this->pluginConf;

        set_error_handler(array($this, 'errHandle'));

        $serverType = !empty($params["WS_SERVER_TYPE"]['server']) ? $params["WS_SERVER_TYPE"]['server'] : $params["server"];

        try {
            switch ($serverType) {
                case "npm" :
                    $url = rtrim("http://" . $params["WS_SERVER_BIND_HOST"] . ":" . $params["WS_SERVER_BIND_PORT"], '/');

                    $client = new ElephantIO\Client(new ElephantIO\Engine\SocketIO\Version1X($url));

                    $client->initialize();
                    $client->emit('broadcast', ['foo' => 'bar']);
                    $client->close();
                    break;

                default:
                    $wDir = $this->getPluginWorkDir(true);
                    $pidFile = $wDir.DIRECTORY_SEPARATOR."ws-pid";
                    if (!file_exists($pidFile)) {
                        return "OFF";
                    } else {
                        $pId = file_get_contents($pidFile);
                        $unixProcess = new UnixProcess();
                        $unixProcess->setPid($pId);
                        $status = $unixProcess->status();
                        if ($status) return "ON";
                        else return "OFF";
                    }
            }
        } catch (Exception $e) {
            return "OFF";
        }

        restore_error_handler();

        return "ON";
    }

    /**
     * @param $errNo
     * @param $errStr
     * @param $errFile
     * @param $errLine
     * @throws ErrorException
     */
    function errHandle($errNo, $errStr, $errFile, $errLine) {
        $msg = "$errStr in $errFile on line $errLine";
        if ($errNo == E_NOTICE || $errNo == E_WARNING) {
            throw new ErrorException($msg, $errNo);
        } else {
            echo $msg;
        }
    }
}
