<?php
namespace OCA\WavesurferPlayer\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\DataResponse;
use OCP\IRequest;
use OCP\Share\IManager;
use OCP\Files\FileInfo;
use OCP\IURLGenerator;

class ShareController extends Controller {
    /** @var IManager */
    private $shareManager;
    
    /** @var IURLGenerator */
    private $urlGenerator;

    public function __construct(
        string $appName,
        IRequest $request,
        IManager $shareManager,
        IURLGenerator $urlGenerator
    ) {
        parent::__construct($appName, $request);
        $this->shareManager = $shareManager;
        $this->urlGenerator = $urlGenerator;
    }

    /**
     * @PublicPage
     * @NoCSRFRequired
     * @param string $shareToken
     * @return DataResponse
     */
    public function getShareInfo($shareToken) {
        try {
            // Get share by token - this is the method for public shares
            $share = $this->shareManager->getShareByToken($shareToken);
            
            if (!$share) {
                return new DataResponse([
                    'error' => 'Share not found',
                    'token' => $shareToken
                ], 404);
            }
    
            $node = $share->getNode();
            $response = [
                'token' => $shareToken,
                'share_id' => $share->getId()
            ];
            
            if ($node->getType() === FileInfo::TYPE_FOLDER) {
                $response['type'] = 'FOLDER';
                
                // Get folder structure for folder shares
                $structure = $this->getFolderContents($node);
                
                // Organize by predefined categories
                $organizedStructure = [
                    'audio_folder' => null,
                    'files_folder' => null,
                    'masters_folder' => null,
                    'stems_folder' => null,
                    'other_folders' => [],
                    'root_files' => []
                ];
                
                foreach ($structure['folders'] as $folder) {
                    $name = $folder['name'];
                    if ($name === 'AUDIO') {
                        $organizedStructure['audio_folder'] = $folder;
                    } else if ($name === 'FILES') {
                        $organizedStructure['files_folder'] = $folder;
                    } else if ($name === 'MASTERS') {
                        $organizedStructure['masters_folder'] = $folder;
                    } else if ($name === 'STEMS') {
                        $organizedStructure['stems_folder'] = $folder;
                    } else {
                        $organizedStructure['other_folders'][] = $folder;
                    }
                }
                
                $organizedStructure['root_files'] = $structure['files'];
                $response['structure'] = $organizedStructure;
                
            } else {
                $mimeType = $node->getMimetype();
                if (strpos($mimeType, 'audio/') === 0) {
                    $response['type'] = 'AUDIO';
                    $response['mime_type'] = $mimeType;
                } else {
                    $response['type'] = 'FILE';
                    $response['mime_type'] = $mimeType;
                }
            }
    
            return new DataResponse($response);
        } catch (\Exception $e) {
            return new DataResponse([
                'error' => $e->getMessage(),
                'token' => $shareToken
            ], 500);
        }
    }

    /**
     * @PublicPage
     * @NoCSRFRequired
     * @param string $shareToken
     * @return DataResponse
     */
    public function getShareType($shareToken) {
        try {
            // Get share by token - this is the method for public shares
            $share = $this->shareManager->getShareByToken($shareToken);
            
            if (!$share) {
                return new DataResponse([
                    'error' => 'Share not found'
                ], 404);
            }
    
            $node = $share->getNode();
            
            if ($node->getType() === FileInfo::TYPE_FOLDER) {
                return new DataResponse(['type' => 'FOLDER']);
            } else {
                $mimeType = $node->getMimetype();
                if (strpos($mimeType, 'audio/') === 0) {
                    return new DataResponse(['type' => 'AUDIO']);
                } else {
                    return new DataResponse(['type' => 'FILE']);
                }
            }
        } catch (\Exception $e) {
            return new DataResponse([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the structure of a shared folder
     * 
     * @PublicPage
     * @NoCSRFRequired
     * @param string $shareToken
     * @return DataResponse
     */
    public function getFolderStructure($shareToken) {
        try {
            $share = $this->shareManager->getShareByToken($shareToken);
            
            if (!$share) {
                return new DataResponse([
                    'error' => 'Share not found'
                ], 404);
            }
            
            $rootNode = $share->getNode();
            
            // Check if the node is a folder
            if ($rootNode->getType() !== FileInfo::TYPE_FOLDER) {
                return new DataResponse([
                    'error' => 'Not a folder share',
                    'type' => 'FILE'
                ], 400);
            }
            
            // Get folder structure recursively
            $structure = $this->getFolderContents($rootNode);
            
            // Organize by predefined categories if they exist
            $organizedStructure = [
                'audio_folder' => null,
                'files_folder' => null,
                'masters_folder' => null,
                'stems_folder' => null,
                'other_folders' => [],
                'root_files' => []
            ];
            
            foreach ($structure['folders'] as $folder) {
                $name = $folder['name'];
                if (strtoupper($name) === 'AUDIO') {
                    $organizedStructure['audio_folder'] = $folder;
                } else if (strtoupper($name) === 'FILES') {
                    $organizedStructure['files_folder'] = $folder;
                } else if (strtoupper($name) === 'MASTERS') {
                    $organizedStructure['masters_folder'] = $folder;
                } else if (strtoupper($name) === 'STEMS') {
                    $organizedStructure['stems_folder'] = $folder;
                } else {
                    $organizedStructure['other_folders'][] = $folder;
                }
            }
            
            $organizedStructure['root_files'] = $structure['files'];
            
            return new DataResponse([
                'token' => $shareToken,
                'structure' => $organizedStructure
            ]);
        } catch (\Exception $e) {
            return new DataResponse([
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Helper method to recursively get folder contents
     * 
     * @param \OCP\Files\Node $folder
     * @return array
     */
    private function getFolderContents($folder) {
        $result = [
            'name' => $folder->getName(),
            'path' => $folder->getPath(),
            'folders' => [],
            'files' => []
        ];
        
        $nodes = $folder->getDirectoryListing();
        
        foreach ($nodes as $node) {
            if ($node->getType() === FileInfo::TYPE_FOLDER) {
                $result['folders'][] = $this->getFolderContents($node);
            } else {
                $fileInfo = [
                    'name' => $node->getName(),
                    'path' => $node->getPath(),
                    'size' => $node->getSize(),
                    'mime_type' => $node->getMimetype(),
                    'is_audio' => strpos($node->getMimetype(), 'audio/') === 0,
                    'extension' => pathinfo($node->getName(), PATHINFO_EXTENSION)
                ];
                
                $result['files'][] = $fileInfo;
            }
        }
        
        return $result;
    }
}