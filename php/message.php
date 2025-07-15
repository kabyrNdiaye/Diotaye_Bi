<?php
header('Content-Type: application/json');

if (!extension_loaded('xml')) {
    echo json_encode(['error' => 'Extension XML non chargée']);
    exit;
}

class XMLDatabase {
    private $messages_file = __DIR__ . '/../xml/messages.xml';

    public function loadXML() {
        if (file_exists($this->messages_file)) {
            return simplexml_load_file($this->messages_file);
        }
        return simplexml_load_string('<?xml version="1.0" encoding="UTF-8"?><messages></messages>');
    }

    public function saveXML($xml) {
        $xml->asXML($this->messages_file);
    }
}

class MessageManager {
    private $db;

    public function __construct() {
        $this->db = new XMLDatabase();
    }

    public function sendMessage($sender_id, $receiver_id, $group_id, $content, $type = 'text') {
        $xml = $this->db->loadXML();
        $id = count($xml->message) + 1;
        $message = $xml->addChild('message');
        $message->addAttribute('id', $id);
        $message->addChild('sender_id', htmlspecialchars($sender_id));
        if (!empty($group_id)) {
            $message->addChild('receiver_id', '');
            $message->addChild('group_id', htmlspecialchars($group_id));
        } else {
            $message->addChild('receiver_id', htmlspecialchars($receiver_id));
            $message->addChild('group_id', '');
        }
        $message->addChild('content', htmlspecialchars($content));
        $message->addChild('timestamp', gmdate('c'));
        $message->addChild('type', htmlspecialchars($type));
        $this->db->saveXML($xml);
        return $id;
    }

    public function getMessages($user_id) {
        $xml = $this->db->loadXML();
        $messages = [];
        foreach ($xml->message as $message) {
            if ((string)$message->receiver_id == $user_id || (string)$message->sender_id == $user_id) {
                $messages[] = $message;
            }
        }
        return $messages;
    }
}

class FileManager {
    public function uploadFile($file, $sender_id, $receiver_id, $group_id) {
        $upload_dir = __DIR__ . '/../uploads/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        $file_path = $upload_dir . basename($file['name']);
        if (move_uploaded_file($file['tmp_name'], $file_path)) {
            $messageManager = new MessageManager();
            return $messageManager->sendMessage($sender_id, $receiver_id, $group_id, $file_path, 'file');
        }
        return false;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_messages') {
    $messageManager = new MessageManager();
    $messages = $messageManager->getMessages($_GET['user_id']);
    $result = [];
    foreach ($messages as $message) {
        $result[] = [
            'sender_id' => (string)$message->sender_id,
            'receiver_id' => (string)$message->receiver_id,
            'group_id' => (string)$message->group_id,
            'content' => (string)$message->content,
            'timestamp' => (string)$message->timestamp,
            'type' => (string)$message->type
        ];
    }
    echo json_encode($result);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action']) && $_POST['action'] === 'send_message') {
        $messageManager = new MessageManager();
        $id = $messageManager->sendMessage($_POST['sender_id'], $_POST['receiver_id'], $_POST['group_id'] ?? '', $_POST['content']);
        echo "Message envoyé avec l'ID : $id";
    } elseif (isset($_FILES['file'])) {
        $fileManager = new FileManager();
        $success = $fileManager->uploadFile($_FILES['file'], $_POST['sender_id'], $_POST['receiver_id'], $_POST['group_id'] ?? '');
        echo $success ? "Fichier uploadé et message créé avec l'ID : $success" : "Échec de l'upload";
    }
}
?>