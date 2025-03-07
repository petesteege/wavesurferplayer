<?php

namespace OCA\WavesurferPlayer\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\Util;

class Application extends App implements IBootstrap {
    public const APP_ID = 'wavesurferplayer';

    public function __construct(array $urlParams = []) {
        parent::__construct(self::APP_ID, $urlParams);
    }

    public function register(IRegistrationContext $context): void {
        // Register scripts and styles
        Util::addScript(self::APP_ID, 'wavesurfer-config');
        Util::addScript(self::APP_ID, 'nc-plyr-controls');
        Util::addScript(self::APP_ID, 'wavesurfer-player');
        Util::addScript(self::APP_ID, 'audio-metadata');
        Util::addScript(self::APP_ID, 'coverart-background');
        Util::addScript(self::APP_ID, 'multi-share-handler'); 
        Util::addScript(self::APP_ID, 'ws-progressbar'); 
        Util::addScript(self::APP_ID, 'meta-tab-handler'); 

        Util::addStyle(self::APP_ID, 'ws-vars');
        Util::addStyle(self::APP_ID, 'wavesurfer');
        Util::addStyle(self::APP_ID, 'metadata');
        Util::addStyle(self::APP_ID, 'coverart-background');
        Util::addStyle(self::APP_ID, 'multi-share');
        Util::addStyle(self::APP_ID, 'meta-tab');

        // Register routes
        $context->registerRouteResource('share');
    }

    public function boot(IBootContext $context): void {
        // Nothing here
    }
}