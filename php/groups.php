<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorisé']);
    exit;
}

$groupsFile = __DIR__ . '/../xml/groups.xml';
$usersFile = __DIR__ . '/../xml/users.xml';
$contactsFile = __DIR__ . '/../xml/contacts.xml';

// Vérifier si les fichiers XML existent
if (!file_exists($groupsFile)) {
    $xmlContent = '<?xml version="1.0" encoding="UTF-8"?><groups></groups>';
    file_put_contents($groupsFile, $xmlContent);
}

if (!file_exists($usersFile)) {
    echo json_encode(['success' => false, 'message' => 'Fichier users.xml manquant']);
    exit;
}

if (!file_exists($contactsFile)) {
    echo json_encode(['success' => false, 'message' => 'Fichier contacts.xml manquant']);
    exit;
}

$xml = simplexml_load_file($groupsFile);
$usersXml = simplexml_load_file($usersFile);
$contactsXml = simplexml_load_file($contactsFile);

if ($xml === false || $usersXml === false || $contactsXml === false) {
    echo json_encode(['success' => false, 'message' => 'Erreur de chargement XML']);
    exit;
}

// GET - Récupérer les groupes de l'utilisateur
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action'])) {
    $userId = $_SESSION['user_id'];
    
    if ($_GET['action'] === 'get_user_groups') {
        $groups = [];
        
    foreach ($xml->group as $group) {
        $groupId = (string)$group['id'];
        $isMember = false;
        $userRole = '';

        // Vérifier si l'utilisateur est membre du groupe
        foreach ($group->members->member as $member) {
            if ((string)$member['user_id'] === $userId) {
                $isMember = true;
                $userRole = (string)$member['role'];
                break;
            }
        }

        if ($isMember) {
            $groups[] = [
                'id' => $groupId,
                'name' => (string)$group->name,
                'description' => (string)$group->description,
                'created_by' => (string)$group->created_by,
                'created_at' => (string)$group->created_at,
                'avatar' => (string)$group->avatar,
                'member_count' => count($group->members->member),
                'user_role' => $userRole,
                    'is_admin' => $userRole === 'admin',
                    'can_manage' => $userRole === 'admin'
            ];
        }
    }

    echo json_encode(['success' => true, 'groups' => $groups]);
        exit;
}

// GET - Récupérer les détails d'un groupe
    elseif ($_GET['action'] === 'get_group_details') {
        $groupId = $_GET['group_id'] ?? '';
    $userId = $_SESSION['user_id'];
    
        if (empty($groupId)) {
            echo json_encode(['success' => false, 'message' => 'ID du groupe requis']);
        exit;
    }

    $group = null;
    $isMember = false;
    $userRole = '';

    foreach ($xml->group as $g) {
        if ((string)$g['id'] === $groupId) {
            // Vérifier si l'utilisateur est membre
            foreach ($g->members->member as $member) {
                if ((string)$member['user_id'] === $userId) {
                    $isMember = true;
                    $userRole = (string)$member['role'];
                    break;
                }
            }

                if (!$isMember) {
                    echo json_encode(['success' => false, 'message' => 'Vous n\'êtes pas membre de ce groupe']);
                    exit;
            }

            $group = [
                'id' => (string)$g['id'],
                'name' => (string)$g->name,
                'description' => (string)$g->description,
                'created_by' => (string)$g->created_by,
                'created_at' => (string)$g->created_at,
                'avatar' => (string)$g->avatar,
                'is_member' => $isMember,
                'user_role' => $userRole,
                    'is_admin' => $userRole === 'admin',
                    'can_manage' => $userRole === 'admin'
            ];

            // Récupérer les membres
            $members = [];
            foreach ($g->members->member as $member) {
                $memberUserId = (string)$member['user_id'];
                $memberRole = (string)$member['role'];
                $joinedAt = (string)$member['joined_at'];

                // Récupérer les informations de l'utilisateur
                foreach ($usersXml->user as $user) {
                    if ((string)$user['id'] === $memberUserId) {
                        $members[] = [
                            'id' => $memberUserId,
                            'name' => (string)$user->name,
                            'phone' => (string)$user->phone,
                                'email' => (string)$user->email,
                            'status' => (string)$user->status,
                                'online' => (string)$user->status === 'Online',
                            'avatar' => (string)$user->avatar,
                            'role' => $memberRole,
                                'joined_at' => $joinedAt,
                                'is_admin' => $memberRole === 'admin'
                        ];
                        break;
                    }
                }
            }

            $group['members'] = $members;
            break;
        }
    }

    if ($group) {
        echo json_encode(['success' => true, 'group' => $group]);
    } else {
            echo json_encode(['success' => false, 'message' => 'Groupe non trouvé']);
        }
        exit;
    }
    
    // GET - Récupérer les contacts disponibles pour ajouter au groupe
    elseif ($_GET['action'] === 'get_available_contacts') {
        $groupId = $_GET['group_id'] ?? '';
        $userId = $_SESSION['user_id'];
        
        if (empty($groupId)) {
            echo json_encode(['success' => false, 'message' => 'ID du groupe requis']);
            exit;
        }

        // Vérifier que l'utilisateur est admin du groupe
        $isAdmin = false;
        foreach ($xml->group as $group) {
            if ((string)$group['id'] === $groupId) {
                foreach ($group->members->member as $member) {
                    if ((string)$member['user_id'] === $userId && (string)$member['role'] === 'admin') {
                        $isAdmin = true;
                        break;
                    }
                }
                break;
            }
        }

        if (!$isAdmin) {
            echo json_encode(['success' => false, 'message' => 'Vous devez être admin pour ajouter des membres']);
            exit;
        }

        // Récupérer les contacts de l'utilisateur
        $userContacts = [];
        foreach ($contactsXml->contact as $contact) {
            if ((string)$contact->user_id === $userId) {
                $contactUserId = (string)$contact->contact_user_id;
                
                // Vérifier si le contact n'est pas déjà dans le groupe
                $isInGroup = false;
                foreach ($xml->group as $group) {
                    if ((string)$group['id'] === $groupId) {
                        foreach ($group->members->member as $member) {
                            if ((string)$member['user_id'] === $contactUserId) {
                                $isInGroup = true;
                                break;
                            }
                        }
                        break;
                    }
                }

                if (!$isInGroup) {
                    // Récupérer les informations de l'utilisateur
                    foreach ($usersXml->user as $user) {
                        if ((string)$user['id'] === $contactUserId) {
                            $userContacts[] = [
                                'id' => $contactUserId,
                                'name' => (string)$user->name,
                                'phone' => (string)$user->phone,
                                'email' => (string)$user->email,
                                'status' => (string)$user->status,
                                'online' => (string)$user->status === 'Online',
                                'avatar' => (string)$user->avatar,
                                'nickname' => (string)$contact->nickname
                            ];
                            break;
                        }
                    }
                }
            }
        }

        echo json_encode(['success' => true, 'contacts' => $userContacts]);
        exit;
    }
}

// POST - Actions sur les groupes
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Créer un nouveau groupe
    if (isset($input['action']) && $input['action'] === 'create_group') {
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $memberIds = $input['member_ids'] ?? [];
    $createdBy = $_SESSION['user_id'];
    
    if (empty($name)) {
            echo json_encode(['success' => false, 'message' => 'Le nom du groupe est requis']);
        exit;
    }

    if (strlen($name) > 100) {
            echo json_encode(['success' => false, 'message' => 'Le nom du groupe est trop long (maximum 100 caractères)']);
            exit;
        }

        if (count($memberIds) < 2) {
            echo json_encode(['success' => false, 'message' => 'Vous devez sélectionner au moins 2 contacts pour créer un groupe']);
        exit;
    }

        // Vérifier que tous les membres sont des contacts de l'utilisateur
        $validMembers = [];
        foreach ($memberIds as $memberId) {
            $isValidContact = false;
            foreach ($contactsXml->contact as $contact) {
                if ((string)$contact->user_id === $createdBy && (string)$contact->contact_user_id === $memberId) {
                    $isValidContact = true;
                    break;
                }
            }
            
            if ($isValidContact) {
                $validMembers[] = $memberId;
            }
        }

        if (count($validMembers) < 2) {
            echo json_encode(['success' => false, 'message' => 'Vous devez sélectionner au moins 2 contacts valides']);
        exit;
    }

    // Générer un nouvel ID
    $maxId = 0;
    foreach ($xml->group as $group) {
            $id = (int)$group['id'];
            if ($id > $maxId) {
                $maxId = $id;
        }
    }
    $newId = $maxId + 1;

        // Créer le groupe
        $group = $xml->addChild('group');
        $group->addAttribute('id', $newId);
        $group->addChild('name', $name);
        $group->addChild('description', $description);
        $group->addChild('created_by', $createdBy);
        $group->addChild('created_at', date('c'));
        $group->addChild('avatar', '');

    // Ajouter les membres
        $members = $group->addChild('members');
        
        // Ajouter le créateur comme admin
        $adminMember = $members->addChild('member');
        $adminMember->addAttribute('user_id', $createdBy);
        $adminMember->addAttribute('role', 'admin');
        $adminMember->addAttribute('joined_at', date('c'));

        // Ajouter les autres membres
        foreach ($validMembers as $memberId) {
            $member = $members->addChild('member');
            $member->addAttribute('user_id', $memberId);
            $member->addAttribute('role', 'member');
            $member->addAttribute('joined_at', date('c'));
        }

        $xml->asXML($groupsFile);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Groupe créé avec succès',
            'group_id' => $newId
        ]);
        exit;
    }

    // Ajouter un membre au groupe
    elseif (isset($input['action']) && $input['action'] === 'add_member') {
        $groupId = $input['group_id'] ?? '';
        $memberId = $input['member_id'] ?? '';
        $userId = $_SESSION['user_id'];
        
        if (empty($groupId) || empty($memberId)) {
            echo json_encode(['success' => false, 'message' => 'ID du groupe et du membre requis']);
            exit;
        }

        // Vérifier que l'utilisateur est admin du groupe
        $isAdmin = false;
        $targetGroup = null;
        foreach ($xml->group as $group) {
            if ((string)$group['id'] === $groupId) {
                $targetGroup = $group;
                foreach ($group->members->member as $member) {
                    if ((string)$member['user_id'] === $userId && (string)$member['role'] === 'admin') {
                    $isAdmin = true;
                    break;
                }
            }
            break;
        }
    }

        if (!$isAdmin) {
            echo json_encode(['success' => false, 'message' => 'Vous devez être admin pour ajouter des membres']);
        exit;
    }

        // Vérifier que le membre n'est pas déjà dans le groupe
        foreach ($targetGroup->members->member as $member) {
            if ((string)$member['user_id'] === $memberId) {
                echo json_encode(['success' => false, 'message' => 'Ce membre est déjà dans le groupe']);
        exit;
            }
        }

        // Vérifier que le membre est un contact de l'utilisateur
        $isValidContact = false;
        foreach ($contactsXml->contact as $contact) {
            if ((string)$contact->user_id === $userId && (string)$contact->contact_user_id === $memberId) {
                $isValidContact = true;
                break;
            }
        }

        if (!$isValidContact) {
            echo json_encode(['success' => false, 'message' => 'Vous ne pouvez ajouter que vos contacts']);
            exit;
    }

    // Ajouter le membre
        $newMember = $targetGroup->members->addChild('member');
        $newMember->addAttribute('user_id', $memberId);
    $newMember->addAttribute('role', 'member');
    $newMember->addAttribute('joined_at', date('c'));

        $xml->asXML($groupsFile);
        
        echo json_encode(['success' => true, 'message' => 'Membre ajouté avec succès']);
        exit;
    }
    
    // Retirer un membre du groupe
    elseif (isset($input['action']) && $input['action'] === 'remove_member') {
        $groupId = $input['group_id'] ?? '';
        $memberId = $input['member_id'] ?? '';
        $userId = $_SESSION['user_id'];
        
        if (empty($groupId) || empty($memberId)) {
            echo json_encode(['success' => false, 'message' => 'ID du groupe et du membre requis']);
            exit;
        }

        // Vérifier que l'utilisateur est admin du groupe
        $isAdmin = false;
        $targetGroup = null;
        foreach ($xml->group as $group) {
            if ((string)$group['id'] === $groupId) {
                $targetGroup = $group;
                foreach ($group->members->member as $member) {
                    if ((string)$member['user_id'] === $userId && (string)$member['role'] === 'admin') {
                        $isAdmin = true;
                        break;
                    }
                }
                break;
            }
        }

        if (!$isAdmin) {
            echo json_encode(['success' => false, 'message' => 'Vous devez être admin pour retirer des membres']);
            exit;
        }

        // Vérifier que le membre n'est pas le créateur du groupe
        if ((string)$targetGroup->created_by === $memberId) {
            echo json_encode(['success' => false, 'message' => 'Vous ne pouvez pas retirer le créateur du groupe']);
            exit;
        }

        // Retirer le membre
        foreach ($targetGroup->members->member as $member) {
            if ((string)$member['user_id'] === $memberId) {
                unset($member[0]);
                break;
            }
        }

        $xml->asXML($groupsFile);
        
        echo json_encode(['success' => true, 'message' => 'Membre retiré avec succès']);
        exit;
    }

    // Modifier les informations du groupe
    elseif (isset($input['action']) && $input['action'] === 'update_group') {
        $groupId = $input['group_id'] ?? '';
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $userId = $_SESSION['user_id'];
        
        if (empty($groupId) || empty($name)) {
            echo json_encode(['success' => false, 'message' => 'ID du groupe et nom requis']);
            exit;
        }

        if (strlen($name) > 100) {
            echo json_encode(['success' => false, 'message' => 'Le nom du groupe est trop long (maximum 100 caractères)']);
            exit;
        }

        // Vérifier que l'utilisateur est admin du groupe
        $isAdmin = false;
        $targetGroup = null;
        foreach ($xml->group as $group) {
            if ((string)$group['id'] === $groupId) {
                $targetGroup = $group;
                foreach ($group->members->member as $member) {
                    if ((string)$member['user_id'] === $userId && (string)$member['role'] === 'admin') {
                    $isAdmin = true;
                    break;
                }
            }
            break;
        }
    }

        if (!$isAdmin) {
            echo json_encode(['success' => false, 'message' => 'Vous devez être admin pour modifier le groupe']);
            exit;
        }

        // Modifier les informations
        $targetGroup->name = $name;
        $targetGroup->description = $description;

        $xml->asXML($groupsFile);
        
        echo json_encode(['success' => true, 'message' => 'Groupe modifié avec succès']);
        exit;
    }

    // Quitter le groupe
    elseif (isset($input['action']) && $input['action'] === 'leave_group') {
        $groupId = $input['group_id'] ?? '';
        $userId = $_SESSION['user_id'];
        
        if (empty($groupId)) {
            echo json_encode(['success' => false, 'message' => 'ID du groupe requis']);
            exit;
        }

        $targetGroup = null;
        $userRole = '';
        $memberElement = null;

        foreach ($xml->group as $group) {
            if ((string)$group['id'] === $groupId) {
                $targetGroup = $group;
                foreach ($group->members->member as $member) {
                    if ((string)$member['user_id'] === $userId) {
                        $userRole = (string)$member['role'];
                        $memberElement = $member;
                        break;
                    }
                }
                break;
            }
        }

        if (!$targetGroup || !$memberElement) {
            echo json_encode(['success' => false, 'message' => 'Vous n\'êtes pas membre de ce groupe']);
            exit;
        }

        // Vérifier que l'utilisateur n'est pas le seul admin
        if ($userRole === 'admin') {
            $adminCount = 0;
            foreach ($targetGroup->members->member as $member) {
                if ((string)$member['role'] === 'admin') {
                    $adminCount++;
                }
            }
            
            if ($adminCount <= 1) {
                echo json_encode(['success' => false, 'message' => 'Vous ne pouvez pas quitter le groupe car vous êtes le seul admin']);
                exit;
            }
        }

        // Quitter le groupe
        unset($memberElement[0]);

        $xml->asXML($groupsFile);
        
        echo json_encode(['success' => true, 'message' => 'Vous avez quitté le groupe']);
        exit;
    }

    // Supprimer le groupe
    elseif (isset($input['action']) && $input['action'] === 'delete_group') {
        $groupId = $input['group_id'] ?? '';
        $userId = $_SESSION['user_id'];
        
        if (empty($groupId)) {
            echo json_encode(['success' => false, 'message' => 'ID du groupe requis']);
            exit;
        }

        $targetGroup = null;
        $isAdmin = false;
        $memberCount = 0;

        foreach ($xml->group as $group) {
            if ((string)$group['id'] === $groupId) {
                $targetGroup = $group;
                $memberCount = count($group->members->member);
    foreach ($group->members->member as $member) {
                    if ((string)$member['user_id'] === $userId && (string)$member['role'] === 'admin') {
                        $isAdmin = true;
                        break;
                    }
                }
            break;
        }
    }

        if (!$targetGroup) {
            echo json_encode(['success' => false, 'message' => 'Groupe non trouvé']);
            exit;
        }

        if (!$isAdmin) {
            echo json_encode(['success' => false, 'message' => 'Vous devez être admin pour supprimer le groupe']);
            exit;
        }

        if ($memberCount > 1) {
            echo json_encode(['success' => false, 'message' => 'Vous ne pouvez supprimer le groupe que s\'il est vide']);
            exit;
        }

        // Supprimer le groupe
        unset($targetGroup[0]);

        $xml->asXML($groupsFile);
        
        echo json_encode(['success' => true, 'message' => 'Groupe supprimé avec succès']);
        exit;
    }
}

echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
?> 