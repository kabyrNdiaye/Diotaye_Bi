<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

// Lire les données JSON si elles existent (compatibilité avec fetch en JSON)
$input = file_get_contents('php://input');
$jsonData = json_decode($input, true);

// Fusionner les données JSON avec $_POST pour la compatibilité
if ($jsonData) {
    $_POST = array_merge($_POST, $jsonData);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$messagesFile = __DIR__ . '/../xml/messages.xml';
$usersFile = __DIR__ . '/../xml/users.xml';

// Création du fichier si besoin
if (!file_exists($messagesFile)) {
    $xmlContent = '<?xml version="1.0" encoding="UTF-8"?><messages></messages>';
    file_put_contents($messagesFile, $xmlContent);
}

// GET - Récupérer les messages (générique pour chats et groupes)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'get_messages') {
    $chatId = $_GET['chat_id'];
    $chatType = $_GET['type'];
    $userId = $_SESSION['user_id'];
    
    $xml = simplexml_load_file($messagesFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement des messages']);
        exit;
    }

    // Charger les informations des fichiers
    $filesFile = __DIR__ . '/../xml/files.xml';
    $filesXml = simplexml_load_file($filesFile);
    $files = [];
    if ($filesXml) {
        foreach ($filesXml->file as $file) {
            $files[(string)$file['id']] = [
                'id' => (string)$file['id'],
                'filename' => (string)$file->filename,
                'original_name' => (string)$file->original_name,
                'file_size' => (int)$file->file_size,
                'file_type' => (string)$file->file_type,
                'mime_type' => (string)$file->mime_type
            ];
        }
    }

    $messages = [];
    foreach ($xml->message as $message) {
        $senderId = (string)$message->sender_id;
        $receiverId = (string)$message->receiver_id;
        $groupId = (string)$message->group_id;
        $fileId = (string)$message->file_id;
        
        // Messages de contact
        if ($chatType === 'contact') {
            if (($senderId === $userId && $receiverId === $chatId) || 
                ($senderId === $chatId && $receiverId === $userId)) {
                
                $messageData = [
                    'id' => (string)$message['id'],
                    'sender_id' => $senderId,
                    'receiver_id' => $receiverId,
                    'content' => (string)$message->content,
                    'timestamp' => (string)$message->timestamp,
                    'type' => (string)$message->type,
                    'status' => (string)$message->status,
                    'file_id' => $fileId
                ];
                
                // Ajouter les informations du fichier si c'est un message de fichier
                if (!empty($fileId) && isset($files[$fileId])) {
                    $messageData['file_name'] = $files[$fileId]['original_name'];
                    $messageData['file_size'] = $files[$fileId]['file_size'];
                    $messageData['file_type'] = $files[$fileId]['file_type'];
                    $messageData['mime_type'] = $files[$fileId]['mime_type'];
                }
                
                $messages[] = $messageData;
            }
        }
        // Messages de groupe
        elseif ($chatType === 'group' && $groupId === $chatId) {
            $messageData = [
                'id' => (string)$message['id'],
                'sender_id' => $senderId,
                'receiver_id' => $receiverId,
                'group_id' => $groupId,
                'content' => (string)$message->content,
                'timestamp' => (string)$message->timestamp,
                'type' => (string)$message->type,
                'status' => (string)$message->status,
                'file_id' => $fileId
            ];
            
            // Ajouter les informations du fichier si c'est un message de fichier
            if (!empty($fileId) && isset($files[$fileId])) {
                $messageData['file_name'] = $files[$fileId]['original_name'];
                $messageData['file_size'] = $files[$fileId]['file_size'];
                $messageData['file_type'] = $files[$fileId]['file_type'];
                $messageData['mime_type'] = $files[$fileId]['mime_type'];
            }
            
            $messages[] = $messageData;
        }
    }

    // Trier par timestamp (plus ancien en premier)
    usort($messages, function($a, $b) {
        return strtotime($a['timestamp']) - strtotime($b['timestamp']);
    });

    echo json_encode(['success' => true, 'messages' => $messages]);
    exit;
}

// GET - Récupérer les messages privés
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'get_private_messages') {
    $userId = $_GET['user_id'];
    $contactId = $_GET['contact_id'];
    
    $xml = simplexml_load_file($messagesFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement des messages']);
        exit;
    }

    $messages = [];
    foreach ($xml->message as $message) {
        $senderId = (string)$message->sender_id;
        $receiverId = (string)$message->receiver_id;
        $groupId = (string)$message->group_id;
        
        // Ignorer les messages de groupe
        if (!empty($groupId)) {
            continue;
        }

        // Récupérer les messages entre les deux utilisateurs
        if (($senderId === $userId && $receiverId === $contactId) || 
            ($senderId === $contactId && $receiverId === $userId)) {
            
            $messages[] = [
                'id' => (string)$message['id'],
                'sender_id' => $senderId,
                'receiver_id' => $receiverId,
                'content' => (string)$message->content,
                'timestamp' => (string)$message->timestamp,
                'type' => (string)$message->type,
                'status' => (string)$message->status,
                'file_id' => (string)$message->file_id
            ];
        }
    }

    // Trier par timestamp (plus ancien en premier)
    usort($messages, function($a, $b) {
        return strtotime($a['timestamp']) - strtotime($b['timestamp']);
    });

    echo json_encode(['success' => true, 'messages' => $messages]);
    exit;
}

// GET - Récupérer les messages de groupe
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'get_group_messages') {
    $groupId = $_GET['group_id'];
    
    $xml = simplexml_load_file($messagesFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement des messages']);
        exit;
    }

    $messages = [];
    foreach (
        $xml->message as $message
    ) {
        $messageGroupId = (string)$message->group_id;
        if ($messageGroupId === $groupId) {
            $fileId = (string)$message->file_id;
            $messageData = [
                'id' => (string)$message['id'],
                'sender_id' => (string)$message->sender_id,
                'receiver_id' => (string)$message->receiver_id,
                'group_id' => $messageGroupId,
                'content' => (string)$message->content,
                'timestamp' => (string)$message->timestamp,
                'type' => (string)$message->type,
                'status' => (string)$message->status,
                'file_id' => $fileId
            ];
            if (!empty($fileId)) {
                $filesFile = __DIR__ . '/../xml/files.xml';
                $filesXml = simplexml_load_file($filesFile);
                if ($filesXml) {
                    foreach ($filesXml->file as $file) {
                        if ((string)$file['id'] === $fileId) {
                            $messageData['file_name'] = (string)$file->original_name;
                            $messageData['file_size'] = (int)$file->file_size;
                            $messageData['file_type'] = (string)$file->file_type;
                            $messageData['mime_type'] = (string)$file->mime_type;
                            break;
                        }
                    }
                }
            }
            $messages[] = $messageData;
        }
    }

    // Trier par timestamp (plus ancien en premier)
    usort($messages, function($a, $b) {
        return strtotime($a['timestamp']) - strtotime($b['timestamp']);
    });

    echo json_encode(['success' => true, 'messages' => $messages]);
    exit;
}

// POST - Marquer les messages comme lus
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'mark_as_read') {
    $userId = $_POST['user_id'];
    $contactId = $_POST['contact_id'] ?? '';
    $groupId = $_POST['group_id'] ?? '';
    
    $xml = simplexml_load_file($messagesFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement des messages']);
        exit;
    }

    $updatedCount = 0;
    foreach ($xml->message as $message) {
        $senderId = (string)$message->sender_id;
        $receiverId = (string)$message->receiver_id;
        $messageGroupId = (string)$message->group_id;
        $status = (string)$message->status;
        
        // Marquer comme lu si c'est un message privé
        if (!empty($contactId) && empty($groupId)) {
            if ($senderId === $contactId && $receiverId === $userId && $status !== 'read') {
                $message->status = 'read';
                $updatedCount++;
            }
        }
        // Marquer comme lu si c'est un message de groupe
        elseif (!empty($groupId) && empty($contactId)) {
            if ($messageGroupId === $groupId && $senderId !== $userId && $status !== 'read') {
                $message->status = 'read';
                $updatedCount++;
            }
        }
    }

    if ($xml->asXML($messagesFile)) {
        echo json_encode([
            'success' => true, 
            'message' => "$updatedCount messages marqués comme lus"
        ]);
        exit;
    } else {
        echo json_encode(['error' => 'Erreur lors de la sauvegarde']);
        exit;
    }
}

// POST - Supprimer un message
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'delete_message') {
    $messageId = $_POST['message_id'];
    $userId = $_SESSION['user_id'];
    
    $xml = simplexml_load_file($messagesFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement des messages']);
        exit;
    }

    $messageFound = false;
    foreach ($xml->message as $message) {
        if ((string)$message['id'] === $messageId && (string)$message->sender_id === $userId) {
            unset($message[0]);
            $messageFound = true;
            break;
        }
    }

    if ($messageFound) {
        if ($xml->asXML($messagesFile)) {
            echo json_encode(['success' => true, 'message' => 'Message supprimé avec succès']);
            exit;
        } else {
            echo json_encode(['error' => 'Erreur lors de la sauvegarde']);
            exit;
        }
    } else {
        echo json_encode(['error' => 'Message non trouvé ou vous n\'êtes pas autorisé à le supprimer']);
        exit;
    }
}

// POST - Envoyer un fichier
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'send_file') {
    $senderId = $_POST['sender_id'];
    $receiverId = $_POST['receiver_id'] ?? '';
    $groupId = $_POST['group_id'] ?? '';
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['error' => 'Erreur lors du téléchargement du fichier']);
        exit;
    }

    $file = $_FILES['file'];
    $fileName = $file['name'];
    $fileSize = $file['size'];
    $fileType = $file['type'];
    $fileTmpName = $file['tmp_name'];

    // Validation du type de fichier
    $allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'mp3', 'mp4', 'avi'];
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    if (!in_array($fileExtension, $allowedTypes)) {
        echo json_encode(['error' => 'Type de fichier non autorisé']);
        exit;
    }

    // Validation de la taille (10MB max)
    if ($fileSize > 10 * 1024 * 1024) {
        echo json_encode(['error' => 'Le fichier est trop volumineux (maximum 10MB)']);
        exit;
    }

    // Créer le dossier de destination s'il n'existe pas
    $uploadDir = __DIR__ . '/../uploads/files/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Générer un nom de fichier unique
    $uniqueFileName = uniqid() . '_' . $fileName;
    $filePath = $uploadDir . $uniqueFileName;

    // Déplacer le fichier
    if (move_uploaded_file($fileTmpName, $filePath)) {
        // Enregistrer le fichier dans files.xml
        $filesXml = simplexml_load_file(__DIR__ . '/../xml/files.xml');
        if ($filesXml === false) {
            $filesXml = simplexml_load_string('<?xml version="1.0" encoding="UTF-8"?><files></files>');
        }

        $maxFileId = 0;
        foreach ($filesXml->file as $file) {
            $fileId = (int)$file['id'];
            if ($fileId > $maxFileId) {
                $maxFileId = $fileId;
            }
        }
        $newFileId = $maxFileId + 1;

        $newFile = $filesXml->addChild('file');
        $newFile->addAttribute('id', $newFileId);
        $newFile->addChild('message_id', '');
        $newFile->addChild('sender_id', $senderId);
        $newFile->addChild('receiver_id', $receiverId);
        $newFile->addChild('group_id', $groupId);
        $newFile->addChild('filename', $uniqueFileName);
        $newFile->addChild('original_name', $fileName);
        $newFile->addChild('file_path', $filePath);
        $newFile->addChild('file_size', $fileSize);
        $newFile->addChild('file_type', $fileType);
        $newFile->addChild('mime_type', $fileExtension);
        $newFile->addChild('uploaded_at', date('c'));
        $newFile->addChild('downloads', '0');
        $newFile->addChild('status', 'active');

        $filesXml->asXML(__DIR__ . '/../xml/files.xml');

        // Créer le message
        $messagesXml = simplexml_load_file($messagesFile);
        $maxMessageId = 0;
        foreach ($messagesXml->message as $message) {
            $messageId = (int)$message['id'];
            if ($messageId > $maxMessageId) {
                $maxMessageId = $messageId;
            }
        }
        $newMessageId = $maxMessageId + 1;

        $newMessage = $messagesXml->addChild('message');
        $newMessage->addAttribute('id', $newMessageId);
        $newMessage->addChild('sender_id', $senderId);
        $newMessage->addChild('receiver_id', $receiverId);
        $newMessage->addChild('group_id', $groupId);
        $newMessage->addChild('content', "Fichier: $fileName");
        $newMessage->addChild('timestamp', date('c'));
        $newMessage->addChild('type', 'file');
        $newMessage->addChild('status', 'sent');
        $newMessage->addChild('file_id', $newFileId);

        $messagesXml->asXML($messagesFile);

        echo json_encode([
            'success' => true, 
            'message' => 'Fichier envoyé avec succès',
            'file_id' => $newFileId,
            'message_id' => $newMessageId
        ]);
        exit;
    } else {
        echo json_encode(['error' => 'Erreur lors du déplacement du fichier']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'send_message') {
    $senderId = $_POST['sender_id'] ?? '';
    $receiverId = $_POST['receiver_id'] ?? '';
    $groupId = $_POST['group_id'] ?? '';
    $content = trim($_POST['content'] ?? '');

    if (empty($senderId) || (empty($receiverId) && empty($groupId)) || empty($content)) {
        echo json_encode(['error' => 'Paramètres manquants']);
        exit;
    }

    $xml = simplexml_load_file($messagesFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement des messages']);
        exit;
    }

    // Générer un nouvel ID
    $maxId = 0;
    foreach ($xml->message as $message) {
        $id = (int)$message['id'];
        if ($id > $maxId) $maxId = $id;
    }
    $newId = $maxId + 1;

    $newMessage = $xml->addChild('message');
    $newMessage->addAttribute('id', $newId);
    $newMessage->addChild('sender_id', $senderId);
    $newMessage->addChild('receiver_id', $receiverId);
    $newMessage->addChild('group_id', $groupId);
    $newMessage->addChild('content', htmlspecialchars($content));
    $newMessage->addChild('timestamp', date('c'));
    $newMessage->addChild('type', 'text');
    $newMessage->addChild('status', 'sent');
    $newMessage->addChild('file_id', '');

    if ($xml->asXML($messagesFile)) {
        echo json_encode(['success' => true, 'message' => 'Message envoyé', 'id' => $newId]);
        exit;
    } else {
        echo json_encode(['error' => 'Erreur lors de la sauvegarde']);
        exit;
    }
}

else {
    echo json_encode(['error' => 'Action non reconnue']);
    exit;
} 