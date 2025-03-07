<?php

return [
    'routes' => [
        [
            'name' => 'share#get_share_info',
            'url' => '/get-share-info/{shareToken}',
            'verb' => 'GET'
        ],
        [
            'name' => 'share#get_share_type',
            'url' => '/get-share-type/{shareToken}',
            'verb' => 'GET'
        ],
        [
            'name' => 'share#get_folder_structure',
            'url' => '/get-folder-structure/{shareToken}',
            'verb' => 'GET'
        ]
    ]
];