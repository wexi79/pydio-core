<?php

use Devristo\Phpws\Messaging\WebSocketMessageInterface;
use Devristo\Phpws\Protocol\Handshake;
use Devristo\Phpws\Protocol\WebSocketTransport;
use Devristo\Phpws\Protocol\WebSocketTransportHybi;
use Devristo\Phpws\Protocol\WebSocketTransportInterface;
use Devristo\Phpws\Server\UriHandler\ClientRouter;
use Devristo\Phpws\Server\UriHandler\WebSocketUriHandler;
use Devristo\Phpws\Server\WebSocketServer;
use Zend\Log\Logger;
use Zend\Log\Writer\Noop;
use Zend\Log\Writer\Stream;

require_once(__DIR__ . '/vendor/autoload.php');
require_once(__DIR__ . '/../../core/classes/guzzle/vendor/autoload.php');

$ADMIN_KEY = 'adminsecretkey';

$optArgs = array();
$options = array();
$regex = '/^-(-?)([a-zA-z0-9_]*)=(.*)/';
foreach ($argv as $key => $argument) {
    if (preg_match($regex, $argument, $matches)) {
        if ($matches[1] == "-") {
            $optArgs[trim($matches[2])] = trim($matches[3]);
        } else {
            $options[trim($matches[2])] = trim($matches[3]);
        }
    }
}

if (!isSet($options["host"]) || !isSet($options["port"])) {
    echo 'You must use the following command: \n > php ws-server.php -host=HOST_IP -port=HOST_PORT [-path=PATH]\n\n';
    exit(0);
}

if ($options["host"] == "localhost") $options["host"] = "127.0.0.1";

class PublicSocketHandler extends WebSocketUriHandler {

    private $host;

    public function __construct__($host) {
        $this->host = $host;
    }

    public function onConnect(WebSocketTransportInterface $user) {

        $host = $user->getHandshakeRequest()->getHeader('Origin')->getFieldValue();

        if($user->getHandshakeRequest()->getCookie() === false){
            return;
        }
        $c = $user->getHandshakeRequest()->getCookie()->getArrayCopy();

        $registry= null;

        $client = new GuzzleHttp\Client(['base_url' => $host]);

        $response = $client->get('/index.php/?get_action=ws_authenticate', ['cookies' => $c]);

        $xml = $response->xml();

        $err = $xml->xpath("//message[@type='ERROR']");
        if (count($err)) {
            $user->close();
        } else {
            $userRepositories = array();
            $repos = $xml->xpath('/tree/user/repositories/repo');
            foreach ($repos as $repo) {
                $repoId = $repo->attributes()->id;
                $userRepositories[] = $repoId;
            }

            $user->ajxpRepositories = $userRepositories;
            $user->ajxpId = '' . $xml->xpath("/tree/user/@id")[0]->id[0];

            $groupPathQuery = $xml->xpath("/tree/user/@groupPath")[0];
            if (count($groupPathQuery)) {
                $groupPath = '' . $groupPathQuery[0]->groupPath[0];
                if (!empty($groupPath)) $user->ajxpGroupPath = $groupPath;
            }

            print('[ECHO] User \'' . $user->ajxpId . '\' connected with ' . count($user->ajxpRepositories) . ' registered repositories ' . PHP_EOL);
        }
    }

    public function onMessage(WebSocketTransportInterface $user, WebSocketMessageInterface $msg) {

        $h = $user->getHandshakeRequest()->getHeaders()->toArray();

        $data = json_decode($msg->getData());

        if (!isset($data->event)) return;

        switch ($data->event) {
            case "register":
                $regId = $data->my;

                if (isset($user->ajxpRepositories) && is_array($user->ajxpRepositories) && in_array($regId, $user->ajxpRepositories)) {
                    $user->currentRepository = $regId;
                }

                print("Registering repo "  . $regId . PHP_EOL);
                break;

            case "unregister":
                unset($user->currentRepository);

                print("Unregistering" . PHP_EOL);
                break;
        }
    }
}

class PrivateSocketHandler extends WebSocketUriHandler {

    private $publicHandler;
    private $ADMIN_KEY;

    public function __construct($publicHandler, $logger, $ADMIN_KEY)
    {
        parent::__construct($logger);
        $this->publicHandler = $publicHandler;
        $this->ADMIN_KEY = $ADMIN_KEY;
    }

    public function onConnect(WebSocketTransportInterface $user) {
        $h = $user->getHandshakeRequest()->getHeaders()->toArray();
        if (array_key_exists('Admin-Key',$h) && $h['Admin-Key'] == $this->ADMIN_KEY) {
            return;
        }
    }

    public function onMessage(WebSocketTransportInterface $user, WebSocketMessageInterface $msg) {

        $h = $user->getHandshakeRequest()->getHeaders()->toArray();

        if (array_key_exists('Admin-Key',$h) && $h['Admin-Key'] == $this->ADMIN_KEY) {

            $data = json_decode($msg->getData());

            $repoId = $data->repoId;
            $msg = $data->message;

            $userId = isset($msg->USER_ID) ? $msg->USER_ID : false;
            $userGroupPath = isset($msg->GROUP_PATH) ? $msg->GROUP_PATH : false;
            $content = $msg->CONTENT;

            print('Admin message dispatcher' . PHP_EOL);

            foreach ($this->publicHandler->getConnections() as $conn) {
                if($conn == $user) continue;

                if ($repoId != 'AJXP_REPO_SCOPE_ALL' && (!isSet($conn->currentRepository) || $conn->currentRepository != $repoId)) continue;

                if ($userId != false && $conn->ajxpId != $userId) continue;

                if ($userGroupPath != false && (!isSet($conn->ajxpGroupPath) || $conn->ajxpGroupPath!=$userGroupPath)) continue;

                print('Should dispatch to user '.$conn->ajxpId . PHP_EOL);
                $conn->sendString($content);
            }
        }

        // Closing connection at the end of the request
        $user->close();
    }
}

$loop = \React\EventLoop\Factory::create();

$logger = new Logger();
$writer = array_key_exists('verbose', $options) && isSet($options["verbose"]) ? new Stream("php://output") : new Noop;
$logger->addWriter($writer);

$server = new WebSocketServer("tcp://{$options["host"]}:{$options["port"]}", $loop, $logger);

$router = new ClientRouter($server, $logger);

$publicHandler = new PublicSocketHandler($options["host"]);
$privateHandler = new PrivateSocketHandler($publicHandler, $logger, $ADMIN_KEY);

$router->addRoute('#^/private$#i', $privateHandler);
$router->addRoute('#^/public$#i', $publicHandler);

// Bind the server
$server->bind();

// Start the event loop
$loop->run();