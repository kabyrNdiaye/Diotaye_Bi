// Variables globales
let currentUser = null;
let settings = {};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    loadSettings();
    initializeEventListeners();
});

// Vérifier la session
function checkSession() {
    fetch('php/check_session.php')
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                currentUser = data.user;
                loadUserProfile();
            } else {
                window.location.href = 'login.html';
            }
        })
        .catch(error => {
            console.error('Erreur de session:', error);
            window.location.href = 'login.html';
        });
}

// Charger le profil utilisateur
function loadUserProfile() {
    if (currentUser) {
        document.getElementById('profileName').value = currentUser.name || '';
        document.getElementById('profileStatus').value = currentUser.status || '';
        
        // Mettre à jour l'avatar
        const avatar = document.getElementById('profileAvatar');
        avatar.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
        
        // Si l'utilisateur a un avatar personnalisé
        if (currentUser.avatar) {
            avatar.style.backgroundImage = `url(${currentUser.avatar})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.textContent = '';
        }
    }
}

// Charger les paramètres
function loadSettings() {
    fetch('php/settings.php?action=get_settings')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                settings = data.settings;
                updateSettingsUI();
            }
        })
        .catch(error => {
            console.error('Erreur chargement paramètres:', error);
        });
}

// Mettre à jour l'interface des paramètres
function updateSettingsUI() {
    // Notifications
    document.getElementById('pushNotifications').classList.toggle('active', settings.push_notifications);
    document.getElementById('sounds').classList.toggle('active', settings.sounds);
    document.getElementById('vibrations').classList.toggle('active', settings.vibrations);
    
    // Confidentialité
    document.getElementById('onlineStatus').classList.toggle('active', settings.online_status);
    document.getElementById('readReceipts').classList.toggle('active', settings.read_receipts);
}

// Initialiser les écouteurs d'événements
function initializeEventListeners() {
    // Input pour l'avatar
    document.getElementById('avatarInput').addEventListener('change', handleAvatarChange);
}

// Changer l'avatar
function changeAvatar() {
    document.getElementById('avatarInput').click();
}

// Gérer le changement d'avatar
function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('action', 'upload_avatar');
    
    fetch('php/settings.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Mettre à jour l'avatar affiché
            const avatar = document.getElementById('profileAvatar');
            avatar.style.backgroundImage = `url(${data.avatar_url})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.textContent = '';
            
            alert('Avatar mis à jour avec succès');
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur upload avatar:', error);
        alert('Erreur lors de l\'upload de l\'avatar');
    });
}

// Mettre à jour le profil
function updateProfile() {
    const name = document.getElementById('profileName').value.trim();
    const status = document.getElementById('profileStatus').value.trim();
    
    if (!name) {
        alert('Veuillez entrer votre nom');
        return;
    }
    
    fetch('php/settings.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'update_profile',
            name: name,
            status: status
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Profil mis à jour avec succès');
            // Mettre à jour l'avatar si le nom a changé
            const avatar = document.getElementById('profileAvatar');
            if (!avatar.style.backgroundImage || avatar.style.backgroundImage === 'none') {
                avatar.textContent = name.charAt(0).toUpperCase();
            }
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur mise à jour profil:', error);
        alert('Erreur lors de la mise à jour du profil');
    });
}

// Basculer un paramètre
function toggleSetting(settingName) {
    const element = document.getElementById(settingName);
    const isActive = element.classList.contains('active');
    
    // Mettre à jour l'interface
    element.classList.toggle('active');
    
    // Sauvegarder le paramètre
    saveSetting(settingName, !isActive);
}

// Sauvegarder un paramètre
function saveSetting(settingName, value) {
    fetch('php/settings.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'save_setting',
            setting: settingName,
            value: value
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            // Remettre l'ancienne valeur en cas d'erreur
            const element = document.getElementById(settingName);
            element.classList.toggle('active');
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur sauvegarde paramètre:', error);
        // Remettre l'ancienne valeur en cas d'erreur
        const element = document.getElementById(settingName);
        element.classList.toggle('active');
        alert('Erreur lors de la sauvegarde du paramètre');
    });
}

// Changer le mot de passe
function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Le nouveau mot de passe doit contenir au moins 6 caractères');
        return;
    }
    
    fetch('php/settings.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'change_password',
            current_password: currentPassword,
            new_password: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Mot de passe changé avec succès');
            // Vider les champs
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur changement mot de passe:', error);
        alert('Erreur lors du changement de mot de passe');
    });
}

// Supprimer le compte
function deleteAccount() {
    const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.');
    if (!confirmDelete) return;
    
    const password = prompt('Veuillez entrer votre mot de passe pour confirmer :');
    if (!password) return;
    
    fetch('php/settings.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'delete_account',
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Compte supprimé avec succès');
            window.location.href = 'login.html';
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur suppression compte:', error);
        alert('Erreur lors de la suppression du compte');
    });
} 