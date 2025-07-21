# Structure XML de la Plateforme de Discussion

## Fichiers XML créés :

### 1. **users.xml** - Gestion des utilisateurs
- **Structure** : Liste des utilisateurs avec leurs informations
- **Champs** : id, name, password, phone, email, status, created_at, last_seen, avatar, bio
- **Fonctionnalités** : Inscription, connexion, gestion de profil

### 2. **contacts.xml** - Gestion des contacts
- **Structure** : Relations entre utilisateurs (qui contacte qui)
- **Champs** : id, user_id, contact_user_id, nickname, favorite, blocked, created_at, last_contact
- **Fonctionnalités** : Ajouter/supprimer contacts, favoris, blocage

### 3. **groups.xml** - Gestion des groupes
- **Structure** : Groupes de discussion avec membres et paramètres
- **Champs** : id, name, description, created_by, created_at, avatar, members, settings
- **Fonctionnalités** : Créer/gérer groupes, ajouter/retirer membres, paramètres

### 4. **messages.xml** - Gestion des messages
- **Structure** : Messages privés et de groupe
- **Champs** : id, sender_id, receiver_id, group_id, content, timestamp, type, status, file_id
- **Fonctionnalités** : Envoi/réception messages, statuts, fichiers attachés

### 5. **files.xml** - Gestion des fichiers
- **Structure** : Fichiers partagés dans les messages
- **Champs** : id, message_id, sender_id, receiver_id, group_id, filename, file_path, file_size, file_type, mime_type, uploaded_at, downloads, status
- **Fonctionnalités** : Upload/download fichiers, gestion des types, statistiques

### 6. **settings.xml** - Paramètres de l'application
- **Structure** : Paramètres globaux et par utilisateur
- **Champs** : app_settings (globaux), user_settings (par utilisateur)
- **Fonctionnalités** : Notifications, confidentialité, thème, langue

## Relations entre les fichiers :

```
users.xml ←→ contacts.xml (relations entre utilisateurs)
users.xml ←→ groups.xml (membres des groupes)
users.xml ←→ messages.xml (expéditeur/destinataire)
messages.xml ←→ files.xml (fichiers attachés)
users.xml ←→ settings.xml (paramètres utilisateur)
```

## Dossiers de stockage :
- `uploads/avatars/` : Photos de profil des utilisateurs
- `uploads/files/` : Fichiers partagés dans les messages
- `uploads/groups/` : Photos de profil des groupes



## Types de messages :
- `text` : Message texte
- `file` : Message avec fichier
- `image` : Message image
- `video` : Message vidéo 