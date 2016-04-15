<?php

use Devristo\Phpws\Client\WebSocket;
use Zend\Log\Logger;

require_once(__DIR__ . '/vendor/autoload.php');

define ('AJXP_SERVER_DEBUG', true);

$repositoryId = 0;
$input = [
    "REPO_ID" => 0, "CONTENT" => "<tree></tree>"
];
$configs = [
    'WS_SERVER_BIND_HOST' => 'localhost',
    "WS_SERVER_BIND_PORT" => 5000,
    "WS_SERVER_ADMIN" => "adminsecretkey"
];

$loop = \React\EventLoop\Factory::create();
$logger = new \Zend\Log\Logger();

if (AJXP_SERVER_DEBUG) {
    $writer = new Zend\Log\Writer\Stream("php://output");
}else {
    $writer = new Zend\Log\Writer\Noop;
}

$logger->addWriter($writer);

if($configs['WS_SERVER_BIND_HOST'] == 'localhost') $configs['WS_SERVER_BIND_HOST']  = '127.0.0.1';

$url = "ws://" . $configs["WS_SERVER_BIND_HOST"] . ":" . $configs["WS_SERVER_BIND_PORT"] . '/private';

$wsClient = new \Devristo\Phpws\Client\WebSocket($url, $loop, $logger);

$wsClient->on("connect", function () use ($logger, $wsClient, $repositoryId, $input, $loop) {
    $msg = new \Devristo\Phpws\Messaging\WebSocketMessage();
    $msg->setData(json_encode([
        'repoId' => $repositoryId,
        'message' => $input
    ]));

    $wsClient->sendMessage($msg);
});

$wsClient->on("request", function ($handshake) use ($logger, $configs) {
    $handshake->getHeaders()->addHeaderLine("Admin-Key", $configs["WS_SERVER_ADMIN"]);
});

$wsClient->open();
$loop->run();