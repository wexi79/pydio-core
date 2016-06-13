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
use GuzzleHttp\Stream\StreamInterface;


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
    
    /**
     * @var array The next key to retrieve when using a directory iterator. Helps for fast directory traversal.
     */
    protected static $nextStat = array();

    /**
     * @var array The list of files not found received as response
     * If we receive a 404 once, we should be able to tell if we created the file after that
     */
    protected static $filesNotFound = array();

    /**
     * Returns a resource representing the stream.
     *
     * @param $path
     * @param StreamInterface $stream The stream to get a resource for
     * @return resource
     */
    public static function getResource($path, StreamInterface $stream)
    {
        $scheme = parse_url($path, PHP_URL_SCHEME);
        self::register($scheme);

        if ($stream->isReadable()) {
            $mode = $stream->isWritable() ? 'r+' : 'r';
        } elseif ($stream->isWritable()) {
            $mode = 'w';
        } else {
            throw new \InvalidArgumentException('The stream must be readable, '
                . 'writable, or both.');
        }
    
        return fopen($path, $mode, null, stream_context_create([
            $scheme => ['stream' => $stream]
        ]));
    }

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

    public function stream_open($path, $mode, $options, &$opened_path)
    {
        $scheme = parse_url($path, PHP_URL_SCHEME);

        $options = stream_context_get_options($this->context);

        if (!isset($options[$scheme]['stream'])) {
            return false;
        }

        $this->mode = $mode;
        $this->stream = $options[$scheme]['stream'];

        return true;
    }

    public function stream_read($count)
    {
        return $this->stream->read($count);
    }

    public function stream_write($data)
    {
        return (int) $this->stream->write($data);
    }

    public function stream_tell()
    {
        return $this->stream->tell();
    }

    public function stream_eof()
    {
        return $this->stream->eof();
    }

    public function stream_seek($offset, $whence)
    {
        $this->stream->seek($offset, $whence);

        return true;
    }

    public function stream_stat()
    {
        static $modeMap = [
            'r'  => 33060,
            'r+' => 33206,
            'w'  => 33188
        ];

        $mode = $modeMap[$this->mode];
        $size = $this->stream->getSize() ?: 0;

        return [
            'dev'     => 0,
            'ino'     => 0,
            'mode'    => $mode,
            'nlink'   => 0,
            'uid'     => 0,
            'gid'     => 0,
            'rdev'    => 0,
            'size'    => $size,
            'atime'   => 0,
            'mtime'   => 0,
            'ctime'   => 0,
            'blksize' => 0,
            'blocks'  => 0
        ];
    }
}