<?php
header('Content-Type: application/json');

if (!extension_loaded('xml')) {
    echo json_encode(['error' => 'Extension XML non chargée']);
    exit;
}

$xmlFile = __DIR__ . '/../xml/groups.xml';

if (!file_exists($xmlFile)) {
    file_put_contents($xmlFile, '<?xml version="1.0" encoding="UTF-8"?><groups></groups>');
}

$xml = simplexml_load_file($xmlFile);

if ($_GET['action'] === 'get_all_groups') {
    $groups = [];
    foreach ($xml->group as $group) {
        $groups[] = [
            'id' => (string)$group['id'],
            'name' => (string)$group->name
        ];
    }
    echo json_encode($groups ?: ['error' => 'Aucun groupe trouvé']);
}
?>