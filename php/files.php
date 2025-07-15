<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorisé']);
    exit;
}

$filesFile = __DIR__ . '/../xml/files.xml';
$messagesFile = __DIR__ . '/../xml/messages.xml';

// Vérifier si les fichiers XML existent
if (!file_exists($filesFile)) {
    $xmlContent = '<?xml version="1.0" encoding="UTF-8"?><files></files>';
    file_put_contents($filesFile, $xmlContent);
}

// GET - Télécharger un fichier
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'download') {
    $fileId = $_GET['file_id'];
    $userId = $_SESSION['user_id'];
    
    if (empty($fileId)) {
        echo json_encode(['success' => false, 'message' => 'ID du fichier requis']);
        exit;
    }
    
    $xml = simplexml_load_file($filesFile);
    if ($xml === false) {
        echo json_encode(['success' => false, 'message' => 'Erreur de chargement des fichiers']);
        exit;
    }
    
    $fileFound = false;
    $filePath = '';
    $fileName = '';
    $errorMessage = '';
    
    foreach ($xml->file as $file) {
        if ((string)$file['id'] === $fileId) {
            $senderId = (string)$file->sender_id;
            $receiverId = (string)$file->receiver_id;
            $groupId = (string)$file->group_id;
            
            // Vérifier que l'utilisateur a le droit de télécharger ce fichier
            if ($senderId === $userId || $receiverId === $userId || !empty($groupId)) {
                $filePath = (string)$file->file_path;
                $fileName = (string)$file->original_name;
                $fileFound = true;
                
                // Incrémenter le compteur de téléchargements
                $downloads = (int)$file->downloads;
                $file->downloads = $downloads + 1;
                $xml->asXML($filesFile);
                break;
            } else {
                $errorMessage = 'Accès non autorisé - Sender: ' . $senderId . ', Receiver: ' . $receiverId . ', Group: ' . $groupId . ', User: ' . $userId;
            }
        }
    }
    
    if (!$fileFound) {
        echo json_encode(['success' => false, 'message' => 'Fichier non trouvé ou accès non autorisé: ' . $errorMessage]);
        exit;
    }
    
    // Vérifier si le fichier existe
    if (!file_exists($filePath)) {
        echo json_encode(['success' => false, 'message' => 'Fichier physique non trouvé: ' . $filePath]);
        exit;
    }
    
    // Déterminer le type MIME
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $mimeTypes = [
        'pdf' => 'application/pdf',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt' => 'text/plain',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'mp4' => 'video/mp4',
        'avi' => 'video/avi',
        'mov' => 'video/quicktime',
        'zip' => 'application/zip',
        'rar' => 'application/x-rar-compressed'
    ];
    
    $mimeType = $mimeTypes[$fileExtension] ?? 'application/octet-stream';
    
    // Envoyer le fichier
    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . $fileName . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    readfile($filePath);
    exit;
}

// GET - Récupérer les fichiers de l'utilisateur
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'get_user_files') {
    $userId = $_SESSION['user_id'];
    
    $xml = simplexml_load_file($filesFile);
    if ($xml === false) {
        echo json_encode(['success' => false, 'message' => 'Erreur de chargement des fichiers']);
        exit;
    }
    
    $files = [];
    foreach ($xml->file as $file) {
        $senderId = (string)$file->sender_id;
        $receiverId = (string)$file->receiver_id;
        $groupId = (string)$file->group_id;
        
        // Récupérer les fichiers envoyés ou reçus par l'utilisateur
        if ($senderId === $userId || $receiverId === $userId || !empty($groupId)) {
            $files[] = [
                'id' => (string)$file['id'],
                'message_id' => (string)$file->message_id,
                'sender_id' => $senderId,
                'receiver_id' => $receiverId,
                'group_id' => $groupId,
                'filename' => (string)$file->filename,
                'original_name' => (string)$file->original_name,
                'file_size' => (int)$file->file_size,
                'file_type' => (string)$file->file_type,
                'mime_type' => (string)$file->mime_type,
                'uploaded_at' => (string)$file->uploaded_at,
                'downloads' => (int)$file->downloads,
                'status' => (string)$file->status
            ];
        }
    }
    
    // Trier par date d'upload (plus récent en premier)
    usort($files, function($a, $b) {
        return strtotime($b['uploaded_at']) - strtotime($a['uploaded_at']);
    });
    
    echo json_encode(['success' => true, 'files' => $files]);
    exit;
}

// POST - Supprimer un fichier
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'delete_file') {
    $fileId = $_POST['file_id'];
    $userId = $_SESSION['user_id'];
    
    if (empty($fileId)) {
        echo json_encode(['success' => false, 'message' => 'ID du fichier requis']);
        exit;
    }
    
    $xml = simplexml_load_file($filesFile);
    if ($xml === false) {
        echo json_encode(['success' => false, 'message' => 'Erreur de chargement des fichiers']);
        exit;
    }
    
    $fileFound = false;
    foreach ($xml->file as $file) {
        if ((string)$file['id'] === $fileId && (string)$file->sender_id === $userId) {
            // Supprimer le fichier physique
            $filePath = (string)$file->file_path;
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            // Supprimer l'entrée XML
            unset($file[0]);
            $fileFound = true;
            break;
        }
    }
    
    if ($fileFound) {
        if ($xml->asXML($filesFile)) {
            echo json_encode(['success' => true, 'message' => 'Fichier supprimé avec succès']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Erreur lors de la sauvegarde']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Fichier non trouvé ou vous n\'êtes pas autorisé à le supprimer']);
    }
    exit;
}

// Si aucune action n'est spécifiée
echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
exit;
?> 