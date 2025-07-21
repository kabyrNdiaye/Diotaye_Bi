<?php
// Script pour générer un mot de passe hashé
$password = 'password123'; // Mot de passe de test
$hashed = password_hash($password, PASSWORD_DEFAULT);

echo "Mot de passe original: $password\n";
echo "Mot de passe hashé: $hashed\n";

// Vérifier que le hash fonctionne
if (password_verify($password, $hashed)) {
    echo " Le hash fonctionne correctement\n";
} else {
    echo " Erreur avec le hash\n";
}

// Mettre à jour le fichier users.xml avec le nouveau mot de passe
$xmlFile = 'xml/users.xml';
if (file_exists($xmlFile)) {
    $xml = simplexml_load_file($xmlFile);
    
    // Mettre à jour le mot de passe de l'utilisateur 1
    $user = $xml->xpath("//user[@id='1']")[0] ?? null;
    if ($user) {
        $user->password = $hashed;
        $xml->asXML($xmlFile);
        echo "Mot de passe mis à jour dans users.xml\n";
    } else {
        echo " Utilisateur 1 non trouvé\n";
    }
} else {
    echo " Fichier users.xml non trouvé\n";
}
?> 