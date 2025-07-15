<?php
require_once 'message.php';

$messageManager = new MessageManager();

// Test envoi de message à un utilisateur
$message_id = $messageManager->sendMessage(1, 2, '', "Nouveau message à un utilisateur", "text");
echo "Envoi de message à un utilisateur : ID = $message_id<br>";

// Test envoi de message à un groupe
$group_id = 1; // Utilise un groupe existant dans groups.xml
$message_id_group = $messageManager->sendMessage(1, '', $group_id, "Message pour le groupe Study Group", "text");
echo "Envoi de message au groupe : ID = $message_id_group<br>";

// Test upload de fichier (simulé, à tester via formulaire)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    $fileManager = new FileManager();
    $file_id = $fileManager->uploadFile($_FILES['file'], 1, 2, '');
    echo "Upload de fichier : ID = $file_id<br>";
} else {
    echo "Utilise un formulaire pour tester l'upload.<br>";
}

// Test récupération des messages
$messages = $messageManager->getMessages(2);
echo "Messages pour l'utilisateur 2 :<br>";
foreach ($messages as $message) {
    $receiver = !empty($message->group_id) ? "Groupe ID: " . $message->group_id : "Utilisateur ID: " . $message->receiver_id;
    echo "ID: " . $message['id'] . ", Contenu: " . $message->content . ", $receiver, Timestamp: " . $message->timestamp . "<br>";
}
?>