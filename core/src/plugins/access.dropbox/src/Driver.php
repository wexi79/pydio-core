<?php
/*
 * Copyright 2007-2013 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
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
 *
 */

namespace Pydio\Access\DropBox;

defined('AJXP_EXEC') or die( 'Access not allowed');

require_once(__DIR__ . '/../vendor/autoload.php');

use Exception;

use GuzzleHttp\Psr7\Stream;
use GuzzleHttp\Psr7\StreamWrapper;
use GuzzleHttp\Tests\Stream\GuzzleStreamWrapperTest;
use Pydio\Access\Core\Model\AJXP_Node;
use Pydio\Access\Core\Model\NodesDiff;
use Pydio\Access\Core\Model\NodesList;
use Pydio\Access\Core\Model\UserSelection;
use Pydio\Access\Core\Stream\Context;
use Pydio\Access\Core\Stream\ContextInterface;
use Pydio\Access\Driver\StreamProvider\FS\fsAccessDriver;
use Pydio\Access\Core\AJXP_MetaStreamWrapper;
use Pydio\Access\Core\RecycleBinManager;
use Pydio\Core\Services\ConfService;
use Pydio\Core\Model\RepositoryInterface;
use Pydio\Core\Services\LocaleService;
use Pydio\Core\Utils\Utils;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;

use CommerceGuys\Guzzle\Oauth2\GrantType\RefreshToken;
use CommerceGuys\Guzzle\Oauth2\GrantType\AuthorizationCode;
use CommerceGuys\Guzzle\Oauth2\Oauth2Subscriber;

/**
 * AJXP_Plugin to access a DropBox enabled server
 * @package AjaXplorer_Plugins
 * @subpackage Access
 */
class Driver extends fsAccessDriver
{
    const PROTOCOL = "pydio.dropbox";
    const RESOURCES_PATH = "Resources";
    const RESOURCES_FILE = "dropbox.json";

    /**
     * @var Context
     */
    private $context;

    /**
     * @var Server $server
     */
    private $server;

    /**
     * Driver Initialization
     * @param $repository
     * @param array $options
     */
    public function init($repository, $options = array())
    {
        parent::init($repository, $options);


    }

    /**
     * Repository Initialization
     * @param \Pydio\Core\Model\ContextInterface $context
     * @return bool|void
     * @internal param ContextInterface $contextInterface
     */
    protected function initRepository(\Pydio\Core\Model\ContextInterface $context)
    {
        $this->server = new Server('pydio.dropbox');
        $this->context = new Context($context->getUser()->getId(), $context->getRepositoryId());

        $this->detectStreamWrapper(true);
        $client = new Client();
        $client->registerStreamWrapper();

        return true;
    }

    public function switchAction(ServerRequestInterface &$request, ResponseInterface &$response)
    {
        if (isset($this->server)) {
            $request = $request->withAttribute("ctx", $this->context);
            $this->server->setRequest($request);
            list ($request, $_) = $this->server->listen();
        }

        return parent::switchAction($request, $response);
    }


    public static function convertPath($value) {
        $node = new AJXP_Node($value);
        $path = $node->getPath();

        if (isset($path)) {
            return $path;
        }
        return "/";
    }
}