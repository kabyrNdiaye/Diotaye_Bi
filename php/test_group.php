<?php
require_once 'group.php';

$groupManager = new GroupManager();

// Test création de groupe
$new_group_id = $groupManager->createGroup("New Study Group", [1, 3]); // Ajoute utilisateurs 1 et 3
echo "Création de groupe : ID = $new_group_id<br>";

// Test ajout de membre
$add_success = $groupManager->addMember($new_group_id, 2); // Ajoute utilisateur 2
echo "Ajout de membre : " . ($add_success ? "Succès" : "Échec") . "<br>";

// Test suppression de membre
$remove_success = $groupManager->removeMember($new_group_id, 1); // Supprime utilisateur 1
echo "Suppression de membre : " . ($remove_success ? "Succès" : "Échec") . "<br>";

// Test récupération de groupe
$group = $groupManager->getGroup($new_group_id);
if ($group) {
    echo "Groupe : " . $group->name . ", Membres : ";
    foreach ($group->members->member as $member) {
        echo $member['id'] . " ";
    }
} else {
    echo "Groupe non trouvé";
}
?>