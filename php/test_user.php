<?php
require_once 'user.php';

$userManager = new UserManager();

// Test inscription
$new_id = $userManager->register("kabyr Ndiaye", "kabyr", "password123");
echo "Inscription : ID = $new_id<br>";

// Test mise à jour
$update_success = $userManager->updateProfile($new_id, "kabyr Updated", "kabyr.updated@esp.sn", "newpassword123");
echo "Mise à jour : " . ($update_success ? "Succès" : "Échec") . "<br>";

// Test récupération
$user = $userManager->getUser($new_id);
if ($user) {
    echo "Utilisateur : " . $user->name . ", Email : " . $user->email . ", Statut : " . $user->status;
} else {
    echo "Utilisateur non trouvé";
}
?>