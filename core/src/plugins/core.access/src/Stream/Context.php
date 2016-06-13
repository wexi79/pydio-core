<?php
/*
 * Copyright 2007-2016 Abstrium <contact (at) pydio.com>
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
 * The latest code can be found at <https://pydio.com/>.
 */
namespace Pydio\Access\Core\Stream;

use GuzzleHttp\Command\Guzzle\GuzzleClient;
use Pydio\Core\Model\UserInterface;
use Pydio\Core\Services\AuthService;
use Pydio\Core\Services\ConfService;

defined('AJXP_EXEC') or die('Access not allowed');


class Context extends \Pydio\Core\Model\Context implements ContextInterface
{

    /**
     * @var GuzzleClient
     */
    private $client;

    public function __construct($userId = null, $repositoryId = null, $client = null)
    {
        parent::__construct($userId, $repositoryId);

        if($client !== null) {
            $this->client = $client;
        }
    }

    /**
     * @param $client
     * @return ContextInterface
     */
    public function withClient($client){
        return new Context($this->userId, $this->repositoryId, $client);
    }


    /**
     * @return boolean
     */
    public function hasClient()
    {
        return !empty($this->client);
    }

    /**
     * @return GuzzleClient |null
     */
    public function getClient()
    {
        if(isset($this->client)){
            return $this->client;
        }

        return null;
    }

    /**
     * @param GuzzleClient $client
     */
    public function setClient($client)
    {
        $this->client = $client;
    }
}