<?php
namespace Pydio\Access\Core\Stream;

use Guzzle\Service\Loader\JsonLoader;
use GuzzleHttp\Command\Guzzle\Description;
use GuzzleHttp\Command\Guzzle\GuzzleClient;
use GuzzleHttp\Client as HTTPClient;
use GuzzleHttp\Stream\Stream as GuzzleStream;
use GuzzleHttp\Stream\StreamInterface;
use Pydio\Access\Core\Model\AJXP_Node;
use Symfony\Component\Config\FileLocator;


/**
 * Decorator used to return only a subset of a stream
 */
class Stream implements StreamInterface
{

    private $stream;
    private $size;
    private $customMetadata;

    /** @var AJXP_Node $node */
    private $node;

    /** @var GuzzleClient $client */
    private $client;

    public function __construct(
        $resource,
        AJXP_Node $node,
        $options
    ) {
        $ctx = $node->getContext();
        $repository = $node->getRepository();

        $apiUrl = $repository->getContextOption($ctx, "API_URL");
        $resourcePath = $repository->getContextOption($ctx, "API_RESOURCES_PATH");
        $resourceFile = $repository->getContextOption($ctx, "API_RESOURCES_FILE");
        $oauth2 = $options["oauth2"];

        if ($resourcePath == "") {
            $resourcePath = $options["api_resources_path"];
        }

        if ($resourceFile == "") {
            $resourceFile = $options["api_resources_file"];
        }

        // Creating Guzzle instances
        $httpClient = new HTTPClient([
            'base_url'=> $apiUrl,
            'auth' => 'oauth2',
            'subscribers' => [$oauth2]
        ]);

        $locator = new FileLocator([$resourcePath]);
        $jsonLoader = new JsonLoader($locator);
        $description = $jsonLoader->load($locator->locate($resourceFile));
        $description = new Description($description);
        $client = new GuzzleClient($httpClient, $description);

        $this->node = $node;
        $this->client = $client;

        $stream = Stream::factory($resource);
        $resource = StreamWrapper::getResource($node->getUrl(), $stream);

        $this->stream = new GuzzleStream($resource, $options);
    }

    public static function factory($resource = '', array $options = [])
    {
        if ($resource instanceof AJXP_Node) {
            $stream = fopen('php://memory', 'r+');

            return new self($stream, $resource, $options);
        }

        return GuzzleStream::factory($resource, $options);
    }

    public function __toString()
    {
        if (!$this->stream) {
            return '';
        }

        $this->seek(0);

        return (string) $this->stream->getContents();
    }

    public function getContents()
    {
        return $this->stream->getContents();
    }

    public function close()
    {
        $this->stream->close();

        $this->detach();
    }

    public function detach()
    {
        $result = $this->stream;
        $this->stream = $this->size = null;
        //$this->readable = $this->writable = $this->seekable = false;

        return $result;
    }

    public function attach($stream)
    {
        $this->stream = $stream;
        $meta = stream_get_meta_data($this->stream);

        /*$this->seekable = $meta['seekable'];
        $this->readable = isset(self::$readWriteHash['read'][$meta['mode']]);
        $this->writable = isset(self::$readWriteHash['write'][$meta['mode']]);*/
    }

    /**
     * Returns the size of the limited subset of data
     * {@inheritdoc}
     */
    public function getSize()
    {
        if ($this->size !== null) {
            return $this->size;
        }

        if (!$this->stream) {
            return null;
        }

        // Clear the stat cache if the stream has a URI
        if ($this->node->getUrl()) {
            clearstatcache(true, $this->node->getUrl());
        }

        $command = $this->client->getCommand('Stat', [
            'path' => $this->node->getUrl()
        ]);
        $result = $this->client->execute($command);

        if (isset($result["size"])) {
            $this->size = (int) $result["size"];
            return $this->size;
        }

        return null;
    }

    public function isReadable()
    {
        return ($this->stream ? true : false);
    }

    public function isWritable()
    {
        return ($this->stream ? true : false);
    }

    public function isSeekable()
    {
        return ($this->stream ? true : false);
    }

    public function eof()
    {
        // Always return true if the underlying stream is EOF
        if ($this->stream->eof()) {
            return true;
        }

        return false;
    }

    /**
     * Allow for a bounded seek on the read limited stream
     * {@inheritdoc}
     */
    public function seek($offset, $whence = SEEK_SET)
    {
        if ($whence !== SEEK_SET || $offset < 0) {
            throw new \RuntimeException(sprintf(
                'Cannot seek to offset % with whence %s',
                $offset,
                $whence
            ));
        }

        $this->stream->seek($offset);
    }

    /**
     * Give a relative tell()
     * {@inheritdoc}
     */
    public function tell()
    {
        return $this->stream->tell();
    }

    public function read($length)
    {
        return '';
    }

    public function write($string)
    {
        // We can't know the size after writing anything
        $this->size = null;

        $this->stream->write($string);
    }

    public function getMetadata($key = null)
    {
        if (!$this->stream) {
            return $key ? null : [];
        } elseif ($this->stream instanceof GuzzleStream) {
            return $this->stream->getMetadata($key);
        } elseif (!$key) {
            return $this->customMetadata + stream_get_meta_data($this->stream);
        } elseif (isset($this->customMetadata[$key])) {
            return $this->customMetadata[$key];
        }
    }
}