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
 */

namespace Pydio\Access\Core\Stream;
use ArrayIterator;
use GuzzleHttp\Stream\GuzzleStreamWrapper;
use GuzzleHttp\Stream\StreamInterface;
use Pydio\Access\Core\Model\AJXP_Node;
use Pydio\Core\Utils\Utils;
use React\Promise\Deferred;


/**
 * Standard stream wrapper to use files with Pydio streams, supporting "r", "w", "a", "x".
 */
class StreamWrapper
{
    /** @var resource */
    public $context;

    /** @var StreamInterface */
    private $stream;

    /** @var string r, r+, or w */
    private $mode;

    /** @var Deferred */
    private $deferred;

    /** @var ArrayIterator */
    private $iterator;

    /**
     * Registers the stream wrapper if needed
     * @param $protocol
     */
    public static function register($protocol)
    {
        if (!in_array($protocol, stream_get_wrappers())) {
            stream_wrapper_register($protocol, __CLASS__);
        }
    }

    public function stream_open($path, $mode, $options, &$opened_path) {
        $node = new AJXP_Node($path);
        $this->stream = new OAuthStream(Stream::factory($node), $node);

        return true;
    }

    /**
     * @param $path
     * @param $options
     * @return bool
     */
    public function dir_opendir($path, $options) {
        $node = new AJXP_Node($path);
        $this->stream = new OAuthStream(Stream::factory($node), $node);

        // TODO - do that asynchronously
        $contents = $this->stream->getContents();
        $this->iterator = new ArrayIterator($contents);

        return true;
    }
    
    /**
     * @return bool
     */
    public function dir_readdir() {
        if (!$this->iterator->valid()) {
            return false;
        }

        $current =  $this->iterator->current();

        $this->iterator->next();

        return $current["name"];
    }
    /**
     * @return bool
     */
    public function dir_closedir() {
        $this->iterator = null;
        $this->stream->close();
        return true;
    }

    /**
     * @return bool
     */
    public function dir_rewinddir() {
        if (isset($this->iterator)) {
            $this->iterator->rewind();
        }

        return true;
    }

    /**
     * Enter description here...
     *
     * @param string $path
     * @param int $mode
     * @param int $options
     * @return bool
     */
    public function mkdir($path, $mode, $options) {
        $node = new AJXP_Node($path);
        $stream = new OAuthStream(Stream::factory($node), $node);
        
        return $stream->mkdir();
    }

    /**
     * Enter description here...
     *
     * @param string $path
     * @param int $mode
     * @param int $options
     * @return bool
     */
    public function rmdir($path, $options) {
        $node = new AJXP_Node($path);
        $stream = new OAuthStream(Stream::factory($node), $node);

        return $stream->rmdir();
    }

    public function url_stat($path, $flags) {
        $node = new AJXP_Node($path);
        $stream = new OAuthStream(Stream::factory($node), $node);
        $resource = PydioStreamWrapper::getResource($stream);
        $stat = fstat($resource);
        fclose($resource);

        return $stat;
    }

    public static function isSeekable() {
        return true;
    }

    public static function isRemote() {
        return true;
    }

    public static function getRealFSReference($path, $persistent = false)
    {
        $node = new AJXP_Node($path);

        $nodeStream = new OAuthStream(Stream::factory($node), $node);
        $nodeHandle = PydioStreamWrapper::getResource($nodeStream);

        $nodeStream->getContents();

        $tmpFile = Utils::getAjxpTmpDir()."/".md5(time()).".".pathinfo($path, PATHINFO_EXTENSION);
        $tmpHandle = fopen($tmpFile, "wb");

        self::copyStreamInStream($nodeHandle, $tmpHandle);

        fclose($tmpHandle);

        if (!$persistent) {
            register_shutdown_function(array("AJXP_Utils", "silentUnlink"), $tmpFile);
        }
        return $tmpFile;
    }

    public static function copyFileInStream($path, $stream)
    {
        $fp = fopen($path, "r");

        self::copyStreamInStream($fp, $stream);

        fclose($fp);
    }

    public static function copyStreamInStream($from, $to)
    {
        while (!feof($from)) {
            $data = fread($from, 4096);
            fwrite($to, $data, strlen($data));
        }
    }
}