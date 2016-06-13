<?php
/**
 * Copyright 2010-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

namespace Pydio\Access\DropBox;

use Pydio\Access\Core\Stream\Client as CoreClient;
use Pydio\Access\Core\Stream\Listener\JSONListener;
use Pydio\Access\Core\Stream\Listener\PathListener;
use Pydio\Access\Core\Stream\Iterator\DirIterator;
use Pydio\Access\Core\Stream\StreamWrapper;
use Guzzle\Service\Loader\JsonLoader;
use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Command\Guzzle\Description as GuzzleDescription;
use Symfony\Component\Config\FileLocator;

use CommerceGuys\Guzzle\Oauth2\GrantType\RefreshToken;
use CommerceGuys\Guzzle\Oauth2\GrantType\PasswordCredentials;
use CommerceGuys\Guzzle\Oauth2\Oauth2Subscriber;

/**
 * Client to interact with a WebDAV FS
 *
 */
class Client extends CoreClient
{
    const PROTOCOL = "pydio.dropbox";
    const RESOURCES_PATH = "Resources";
    const RESOURCES_FILE = "dropbox.json";

    protected $urlParams;

    /**
     *
     * OneDRIVE Client implementation
     *
     */
    public function __construct($config = array())
    {
        // Creating Guzzle instances
        $httpClient = new GuzzleClient($config);
    }

    /**
     * Register this client on the StreamWrapper
     */
    public function registerStreamWrapper() {
        //StreamWrapper::register($this, 'pydio.dropbox');
    }
}