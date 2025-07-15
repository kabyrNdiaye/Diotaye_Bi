// Variables globales
let currentUser = null;
let currentChat = null;
let contacts = [];
let chats = [];
let groups = [];

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    initializeEventListeners();
    startMessagePolling();
    // Gestion du bouton de déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            fetch('php/logout.php', { method: 'POST' })
                .then(() => {
                    window.location.href = 'login.html';
                })
                .catch(() => {
                    window.location.href = 'login.html';
                });
        });
    }
});

// Vérifier la session utilisateur
function checkSession() {
    fetch('php/check_session.php')
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                currentUser = data.user;
                loadUserInfo();
                loadChats();
                loadContacts();
                loadGroups();
            } else {
                window.location.href = 'login.html';
            }
        })
        .catch(error => {
            console.error('Erreur de session:', error);
            window.location.href = 'login.html';
        });
}

// Charger les informations de l'utilisateur
function loadUserInfo() {
    if (currentUser) {
        document.getElementById('currentUserName').textContent = currentUser.name;
        document.getElementById('currentUserAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

// Initialiser les écouteurs d'événements
function initializeEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Recherche
    document.getElementById('searchBar').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterItems(searchTerm);
    });

    // Envoi de messages
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Input message
    document.getElementById('messageInput').addEventListener('input', function() {
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = this.value.trim() === '';
    });

    // Upload de fichiers
    document.getElementById('uploadBtn').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Modals
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });

    // Fermer modals en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// Changer d'onglet
function switchTab(tabName) {
    // Masquer toutes les listes
    document.getElementById('discussionsList').style.display = 'none';
    document.getElementById('contactsList').style.display = 'none';
    document.getElementById('groupsList').style.display = 'none';
    // Masquer le header du bouton discussion partout
    const discussionsHeader = document.querySelector('.discussions-header');
    if (discussionsHeader) discussionsHeader.style.display = 'none';
    // Désactiver tous les onglets
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    // Afficher la bonne section
    if (tabName === 'discussions') {
        document.getElementById('discussionsList').style.display = '';
        document.querySelector('.nav-tab[data-tab="discussions"]').classList.add('active');
        // Afficher le header du bouton discussion
        if (discussionsHeader) discussionsHeader.style.display = '';
        displayDiscussions(contacts);
    } else if (tabName === 'contacts') {
        document.getElementById('contactsList').style.display = '';
        document.querySelector('.nav-tab[data-tab="contacts"]').classList.add('active');
        displayContacts(contacts);
        setTimeout(() => { initializeContactFormEvents(); }, 100);
    } else if (tabName === 'groups') {
        document.getElementById('groupsList').style.display = '';
        document.querySelector('.nav-tab[data-tab="groups"]').classList.add('active');
        displayGroups(groups);
    }
}

// Filtrer les éléments
function filterItems(searchTerm) {
    const activeTab = document.querySelector('.nav-tab.active').dataset.tab;
    
    if (activeTab === 'chats') {
        filterChats(searchTerm);
    } else if (activeTab === 'contacts') {
        filterContacts(searchTerm);
    } else if (activeTab === 'groups') {
        filterGroups(searchTerm);
    }
}

// Charger les chats
function loadChats() {
    fetch('php/chats.php?action=get_chats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                chats = data.chats;
                displayChats(chats);
            }
        })
        .catch(error => {
            console.error('Erreur chargement chats:', error);
            const chatsContainer = document.getElementById('discussionsList');
            if (chatsContainer) {
                chatsContainer.innerHTML = '<div class="error">Erreur de chargement</div>';
            }
        });
}

// Afficher les chats
function displayChats(chatsList) {
    const container = document.getElementById('discussionsList');
    container.innerHTML = '';

    if (chatsList.length === 0) {
        container.innerHTML = '<div class="no-items">Aucun chat récent</div>';
        return;
    }

    // Trier par date du dernier message (plus récent en haut, plus ancien en bas)
    const sortedChats = [...chatsList].sort((a, b) => {
        const ta = a.last_time ? new Date(a.last_time).getTime() : 0;
        const tb = b.last_time ? new Date(b.last_time).getTime() : 0;
        return tb - ta; // Inversé pour avoir le plus récent en haut
    });

    sortedChats.forEach(chat => {
        const chatElement = createChatElement(chat);
        container.appendChild(chatElement);
    });
}

// Créer un élément chat
function createChatElement(chat) {
    // Chercher le contact à jour pour le nickname
    let upToDateContact = contacts.find(c => c.id === chat.id || c.contact_id === chat.id);
    let displayName = (upToDateContact && upToDateContact.nickname) ? upToDateContact.nickname : chat.name;
    const div = document.createElement('div');
    div.className = 'contact-item';
    div.onclick = () => openChat(chat);

    const lastMessage = chat.last_message || 'Aucun message';
    const time = chat.last_time ? formatTime(chat.last_time) : '';

    div.innerHTML = `
        <div class="contact-avatar">
            ${displayName.charAt(0).toUpperCase()}
        </div>
        <div class="contact-info">
            <div class="contact-name">${displayName}</div>
            <div class="contact-status">${lastMessage}</div>
        </div>
        <div class="contact-time">${time}</div>
    `;

    return div;
}

// Filtrer les chats
function filterChats(searchTerm) {
    const filtered = chats.filter(chat => 
        chat.name.toLowerCase().includes(searchTerm)
    );
    displayChats(filtered);
}

// Charger les contacts
function loadContacts() {
    console.log('Chargement des contacts...');
    console.log('Utilisateur actuel:', currentUser);
    
    fetch('php/contacts.php?action=get_contacts')
        .then(response => response.json())
        .then(data => {
            console.log('Réponse API contacts:', data);
            if (data.success) {
                contacts = data.contacts;
                console.log('Contacts chargés:', contacts);
                displayContacts(contacts);
            } else {
                console.error('Erreur API contacts:', data.message);
                document.getElementById('contactsList').innerHTML = '<div class="error">Erreur: ' + data.message + '</div>';
            }
        })
        .catch(error => {
            console.error('Erreur chargement contacts:', error);
            document.getElementById('contactsList').innerHTML = '<div class="error">Erreur de chargement</div>';
        });
}

// Afficher les contacts
function displayContacts(contactsList) {
    console.log('Affichage des contacts:', contactsList);
    const container = document.getElementById('contactsList');
    
    // Vérifier si le header existe déjà, sinon le créer
    let header = container.querySelector('.contacts-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'contacts-header';
        header.innerHTML = `
            <button class="add-contact-btn" id="showAddContactFormBtn" type="button">
                <i class="fas fa-plus"></i> Ajouter un contact
            </button>
        `;
    }
    
    // Vérifier si le formulaire existe déjà, sinon le créer
    let addForm = container.querySelector('#addContactForm');
    if (!addForm) {
        addForm = document.createElement('div');
        addForm.id = 'addContactForm';
        addForm.style.display = 'none';
        addForm.style.background = '#F0F2F5';
        addForm.style.padding = '15px';
        addForm.style.borderRadius = '8px';
        addForm.style.margin = '10px 0';
        addForm.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #128C7E;">Rechercher un utilisateur</h4>
            <div style="margin-bottom: 10px;">
                <input type="text" id="searchContactPhone" placeholder="Numéro de téléphone" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-primary" id="searchContactBtn">
                    <i class="fas fa-search"></i> Rechercher
                </button>
                <button type="button" class="btn btn-secondary" id="cancelAddContactBtn">
                    <i class="fas fa-times"></i> Annuler
                </button>
                </div>
            <div id="searchContactResults" style="margin-top: 10px;"></div>
        `;
    }
    
    // Créer le conteneur des contacts
    const contactsContainer = document.createElement('div');
    contactsContainer.className = 'contacts-container';
    contactsContainer.style.marginTop = '20px';
    contactsContainer.id = 'contactsListContainer';
    
    if (contactsList.length === 0) {
        contactsContainer.innerHTML = '<div class="no-items">📭 Aucun contact ajouté</div>';
    } else {
        // Ajouter un titre pour la liste des contacts
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-weight: bold; color: #128C7E; margin-bottom: 15px; font-size: 16px;';
        titleDiv.innerHTML = `📞 Vos contacts (${contactsList.length})`;
        contactsContainer.appendChild(titleDiv);
        
        // Trier les contacts : favoris en premier, puis par date de création (plus récents en bas)
        const sortedContacts = [...contactsList].sort((a, b) => {
            // D'abord par statut favori
            if (a.favorite && !b.favorite) return -1;
            if (!a.favorite && b.favorite) return 1;
            
            // Puis par date de création (plus récents en bas)
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateA - dateB;
        });
        
        console.log('Contacts triés:', sortedContacts);
        
        // Créer les éléments de contact avec animation progressive
        sortedContacts.forEach((contact, index) => {
            const contactElement = createContactElement(contact);
            
            // Animation d'apparition progressive
            contactElement.style.opacity = '0';
            contactElement.style.transform = 'translateY(20px)';
            contactElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            contactsContainer.appendChild(contactElement);
            
            // Déclencher l'animation avec un délai
            setTimeout(() => {
                contactElement.style.opacity = '1';
                contactElement.style.transform = 'translateY(0)';
            }, index * 50); // 50ms de délai entre chaque contact
        });
    }
    
    // Reconstruire le contenu en s'assurant que le header et le formulaire sont présents
    container.innerHTML = '';
    container.appendChild(header);
    container.appendChild(addForm);
    container.appendChild(contactsContainer);
    
    // Réinitialiser les événements après reconstruction
    setTimeout(() => {
        initializeContactFormEvents();
    }, 10);
    
    // Faire défiler vers le bas pour voir les nouveaux contacts
    if (contactsList.length > 0) {
        setTimeout(() => {
            const lastContact = contactsContainer.querySelector('.contact-item:last-child');
            if (lastContact) {
                lastContact.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 200);
    }
}

// Créer un élément contact (pour la gestion, sans ouverture de chat)
function createContactElement(contact) {
    const div = document.createElement('div');
    div.className = 'contact-item';
    
    // Afficher le statut en ligne/hors ligne
    const statusText = contact.online ? 'En ligne' : 'Hors ligne';
    const statusClass = contact.online ? 'online' : 'offline';
    
    // Afficher le téléphone si disponible
    const phoneInfo = contact.phone ? `<div class="contact-phone">📱 ${contact.phone}</div>` : '';
    
    // Afficher l'email si disponible
    const emailInfo = contact.email ? `<div class="contact-email">📧 ${contact.email}</div>` : '';
    
    // Afficher le surnom si différent du nom
    const nicknameInfo = contact.nickname && contact.nickname !== contact.name ? 
        `<div class="contact-nickname">💬 ${contact.nickname}</div>` : '';
    
    // Utiliser le surnom s'il existe, sinon le nom
    const displayName = contact.nickname || contact.name;
    
    // Déterminer l'ID correct pour les actions
    const contactId = contact.contact_id || contact.id;
    
    div.innerHTML = `
        <div class="contact-avatar">
            ${displayName.charAt(0).toUpperCase()}
        </div>
        <div class="contact-info">
            <div class="contact-name">${displayName}</div>
            ${phoneInfo}
            ${emailInfo}
            ${nicknameInfo}
        </div>
        <div class="contact-actions">
            <button class="contact-action-btn edit" onclick="editContact('${contactId}', event)" title="Modifier le surnom">
                <i class="fas fa-edit"></i>
            </button>
            <button class="contact-action-btn ${contact.favorite ? 'unfavorite' : 'favorite'}" 
                    onclick="toggleFavorite('${contactId}', event)" 
                    title="${contact.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                <i class="fas fa-star"></i>
            </button>
            <button class="contact-action-btn delete" onclick="deleteContact('${contactId}', event)" title="Supprimer le contact">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return div;
}

// Filtrer les contacts
function filterContacts(searchTerm) {
    const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm)
    );
    displayContacts(filtered);
}

// Charger les groupes
function loadGroups() {
    console.log('Chargement des groupes...');
    
    fetch('php/groups.php?action=get_user_groups')
        .then(response => response.json())
        .then(data => {
            console.log('Réponse API groupes:', data);
            if (data.success) {
                groups = data.groups;
                console.log('Groupes chargés:', groups);
                displayGroups(groups);
            } else {
                console.error('Erreur API groupes:', data.message);
                document.getElementById('groupsList').innerHTML = '<div class="error">Erreur: ' + data.message + '</div>';
            }
        })
        .catch(error => {
            console.error('Erreur chargement groupes:', error);
            document.getElementById('groupsList').innerHTML = '<div class="error">Erreur de chargement</div>';
        });
}

// Afficher les groupes
function displayGroups(groupsList) {
    console.log('Affichage des groupes:', groupsList);
    const container = document.getElementById('groupsList');
    
    // Vérifier si le header existe déjà, sinon le créer
    let header = container.querySelector('.groups-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'groups-header';
        header.innerHTML = `
            <button class="create-group-btn" id="showCreateGroupFormBtn" type="button">
                <i class="fas fa-plus"></i> Créer un groupe
            </button>
        `;
    }
    
    // Vérifier si le formulaire existe déjà, sinon le créer
    let createForm = container.querySelector('#createGroupForm');
    if (!createForm) {
        createForm = document.createElement('div');
        createForm.id = 'createGroupForm';
        createForm.style.display = 'none';
        createForm.style.background = '#F0F2F5';
        createForm.style.padding = '15px';
        createForm.style.borderRadius = '8px';
        createForm.style.margin = '10px 0';
        createForm.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #128C7E;">Créer un nouveau groupe</h4>
            <div style="margin-bottom: 10px;">
                <input type="text" id="groupName" placeholder="Nom du groupe" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 10px;">
                <textarea id="groupDescription" placeholder="Description du groupe (optionnel)" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 60px; resize: vertical;"></textarea>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Sélectionner au moins 2 contacts:</label>
                <div id="groupContactsList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: white;"></div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-primary" id="createGroupBtn">
                    <i class="fas fa-users"></i> Créer le groupe
                </button>
                <button type="button" class="btn btn-secondary" id="cancelCreateGroupBtn">
                    <i class="fas fa-times"></i> Annuler
                </button>
            </div>
        `;
    }
    
    // Créer le conteneur des groupes
    const groupsContainer = document.createElement('div');
    groupsContainer.className = 'groups-container';
    groupsContainer.style.marginTop = '20px';
    groupsContainer.id = 'groupsListContainer';
    
    if (groupsList.length === 0) {
        groupsContainer.innerHTML = '<div class="no-items">👥 Aucun groupe créé</div>';
    } else {
        // Ajouter un titre pour la liste des groupes
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-weight: bold; color: #128C7E; margin-bottom: 15px; font-size: 16px;';
        titleDiv.innerHTML = `👥 Vos groupes (${groupsList.length})`;
        groupsContainer.appendChild(titleDiv);
        
        // Créer les éléments de groupe avec animation progressive
        groupsList.forEach((group, index) => {
            const groupElement = createGroupElement(group);
            
            // Animation d'apparition progressive
            groupElement.style.opacity = '0';
            groupElement.style.transform = 'translateY(20px)';
            groupElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            groupsContainer.appendChild(groupElement);
            
            // Déclencher l'animation avec un délai
            setTimeout(() => {
                groupElement.style.opacity = '1';
                groupElement.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
    
    // Reconstruire le contenu
    container.innerHTML = '';
    container.appendChild(header);
    container.appendChild(createForm);
    container.appendChild(groupsContainer);
    
    // Réinitialiser les événements
    setTimeout(() => {
        initializeGroupFormEvents();
    }, 10);
}

// Créer un élément groupe
function createGroupElement(group) {
    const div = document.createElement('div');
    div.className = 'group-item';
    div.onclick = () => openChat({ ...group, type: 'group', is_member: true });
    
    const adminBadge = group.is_admin ? '<span class="admin-badge">👑 Admin</span>' : '';
    const memberCount = group.member_count || 0;
    
    div.innerHTML = `
        <div class="group-avatar">
            👥
        </div>
        <div class="group-info">
            <div class="group-name">${group.name} ${adminBadge}</div>
            <div class="group-description">${group.description || 'Aucune description'}</div>
            <div class="group-members">👤 ${memberCount} membre(s)</div>
            <div class="group-created">📅 Créé le ${formatDate(group.created_at)}</div>
        </div>
        <div class="group-actions">
            ${group.can_manage ? `
                <button class="group-action-btn edit" onclick="editGroupInfo('${group.id}', event)" title="Modifier le groupe">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="group-action-btn manage" onclick="manageGroupMembers('${group.id}', event)" title="Gérer les membres">
                    <i class="fas fa-users-cog"></i>
                </button>
            ` : ''}
            <button class="group-action-btn leave" onclick="leaveGroup('${group.id}', event)" title="Quitter le groupe">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        </div>
    `;
    return div;
}

// Filtrer les groupes
function filterGroups(searchTerm) {
    const filtered = groups.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    displayGroups(filtered);
}

// Ouvrir un chat
function openChat(chat) {
    // Si c'est un groupe et que les membres ne sont pas présents, on les charge d'abord
    if (chat.type === 'group' && (!chat.members || !Array.isArray(chat.members))) {
        fetch(`php/groups.php?action=get_group_details&group_id=${chat.id}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.group) {
                    // On relance openChat avec les membres inclus
                    openChat({ ...chat, ...data.group });
                } else {
                    alert("Impossible de charger les membres du groupe.");
                }
            })
            .catch(error => {
                console.error('Erreur chargement membres groupe:', error);
                alert("Erreur lors du chargement des membres du groupe.");
            });
        return;
    }
    currentChat = chat;
    // Log pour debug : vérifier la présence des membres
    if (currentChat.type === 'group') {
        console.log('[DEBUG] currentChat après ouverture groupe:', currentChat);
        if (currentChat.members && Array.isArray(currentChat.members)) {
            console.log('[DEBUG] Liste des membres du groupe:', currentChat.members);
        } else {
            console.warn('[DEBUG] Aucun membre trouvé dans currentChat.members');
        }
    }
    // Afficher l'interface de chat
    document.getElementById('welcomeMessage').style.display = 'none';
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('messagesArea').style.display = 'block';
    document.getElementById('messageInputContainer').style.display = 'flex';

    // Mettre à jour l'en-tête du chat
    const displayName = chat.nickname || chat.name;
    document.getElementById('chatContactName').textContent = displayName;
    document.getElementById('chatContactAvatar').textContent = displayName.charAt(0).toUpperCase();

    // Charger les messages
    if (chat.type === 'group') {
        // Vérifier que l'utilisateur est bien membre du groupe côté JS (si info présente)
        if (typeof chat.is_member !== 'undefined' && !chat.is_member) {
            alert("Vous n'êtes pas membre de ce groupe ou ce groupe n'existe pas.");
            // Réinitialiser l'UI
            document.getElementById('messagesArea').style.display = 'none';
            document.getElementById('messageInputContainer').style.display = 'none';
            document.getElementById('chatHeader').style.display = 'none';
            document.getElementById('welcomeMessage').style.display = '';
            return;
        }
        loadMessages(chat.id, 'group');
    } else {
        loadMessages(chat.id, 'contact');
    }

    // Marquer les messages comme lus
    if (chat.type === 'contact') {
        markMessagesAsRead(chat.id, 'contact');
    }

    // Mettre à jour l'état actif dans la liste
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.remove('active');
    });

    // Trouver et activer l'élément correspondant
    const chatElement = document.querySelector(`[data-chat-id="${chat.id}"]`);
    if (chatElement) {
        chatElement.classList.add('active');
    }
}

// Charger les messages
function loadMessages(chatId, chatType) {
    let url = '';
    if (chatType === 'group') {
        url = `php/messages.php?action=get_group_messages&group_id=${chatId}`;
    } else {
        url = `php/messages.php?action=get_private_messages&user_id=${currentUser.id}&contact_id=${chatId}`;
    }
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayMessages(data.messages);
            }
        })
        .catch(error => {
            console.error('Erreur chargement messages:', error);
        });
}

// Afficher les messages
function displayMessages(messages) {
    const container = document.getElementById('messagesArea');
    container.innerHTML = '';

    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        container.appendChild(messageElement);
    });

    // Scroll vers le bas
    container.scrollTop = container.scrollHeight;
}

// Créer un élément message
function createMessageElement(message) {
    const isSent = message.sender_id == currentUser.id;
    const div = document.createElement('div');
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    div.setAttribute('data-message-id', message.id);

    let senderName = '';
    if (currentChat && currentChat.type === 'group') {
        if (currentChat.members && Array.isArray(currentChat.members)) {
            const sender = currentChat.members.find(m => String(m.id) === String(message.sender_id));
            senderName = sender ? `<div class='sender-name'>${sender.name}</div>` : `<div class='sender-name'>Utilisateur ${message.sender_id}</div>`;
        } else {
            senderName = `<div class='sender-name'>Utilisateur ${message.sender_id}</div>`;
        }
    } else if (currentChat && currentChat.type === 'contact') {
        // Afficher le nom pour les discussions simples
        if (isSent) {
            senderName = `<div class='sender-name'>${currentUser.name || 'Moi'}</div>`;
        } else {
            // Chercher le nom du contact
            let contactName = currentChat.nickname || currentChat.name || 'Contact';
            senderName = `<div class='sender-name'>${contactName}</div>`;
        }
    }

    let content = '';
    if (message.type === 'file') {
        let fileIcon = getFileIcon(message.file_type || message.mime_type || 'other');
        let isImage = (message.file_type || message.mime_type || '').startsWith('image/');
        let iconHtml = fileIcon.icon.startsWith('fa')
            ? `<i class=\"fas ${fileIcon.icon}\" style=\"color:#FF4444;\"></i>`
            : `<span class=\"file-emoji\">${fileIcon.icon}</span>`;
        const fileSize = formatFileSize(message.file_size || 0);
        const fileName = message.file_name || message.content || 'Fichier';
        const downloadBtn = message.file_id ? `<button class=\"download-btn\" onclick=\"downloadFile('${message.file_id}')\" title=\"Télécharger\"><i class=\"fas fa-download\"></i></button>` : '';
        if (isImage && message.file_id) {
            // Affichage image avec aperçu + lightbox
            content = `
                <div class=\"message-bubble\">
                    ${senderName}
                    <div class=\"message-content file-message\" style=\"flex-direction:column;align-items:flex-start;\">
                        <img src=\"php/files.php?action=download&file_id=${message.file_id}\" alt=\"${fileName}\" class=\"message-image\" style=\"max-width:180px;max-height:160px;border-radius:8px;margin-bottom:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;\" onclick=\"showImageLightbox('php/files.php?action=download&file_id=${message.file_id}')\" title=\"Cliquez pour agrandir\">
                        <div style=\"display:flex;align-items:center;gap:8px;\">
                            <span class=\"file-name\">${fileName}</span>
                            <span class=\"file-size\">${fileSize}</span>
                            ${downloadBtn}
                        </div>
                    </div>
                    <div class=\"message-time\">${formatTime(message.timestamp)}</div>
                </div>
            `;
        } else {
            // Affichage fichier classique
            content = `
                <div class=\"message-bubble\">
                    ${senderName}
                    <div class=\"message-content file-message\">
                        <span class=\"file-icon\">${iconHtml}</span>
                        <span class=\"file-name\">${fileName}</span>
                        <span class=\"file-size\">${fileSize}</span>
                        ${downloadBtn}
                    </div>
                    <div class=\"message-time\">${formatTime(message.timestamp)}</div>
                </div>
            `;
        }
    } else {
        // Message texte normal
        content = `
            <div class="message-bubble">
                ${senderName}
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    }
    div.innerHTML = content;
    return div;
}

// Envoyer un message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !currentChat) return;

    // Préparer les données POST attendues par messages.php
    const formData = new URLSearchParams();
    formData.append('action', 'send_message');
    formData.append('sender_id', currentUser.id);
    if (currentChat.type === 'group') {
        formData.append('group_id', currentChat.id);
        formData.append('receiver_id', '');
    } else {
        formData.append('receiver_id', currentChat.id);
        formData.append('group_id', '');
    }
    formData.append('content', content);

    fetch('php/messages.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            input.value = '';
            document.getElementById('sendBtn').disabled = true;
            
            // Ajouter le message à l'affichage
            const message = {
                id: data.id || data.message_id,
                content: content,
                sender_id: currentUser.id,
                timestamp: new Date().toISOString()
            };
            
            const messageElement = createMessageElement(message);
            document.getElementById('messagesArea').appendChild(messageElement);
            
            // Scroll vers le bas
            const messagesArea = document.getElementById('messagesArea');
            messagesArea.scrollTop = messagesArea.scrollHeight;
            
            // Actualiser la liste des discussions pour montrer le dernier message
            loadChats();
            
            // Marquer les messages comme lus si c'est un contact
            if (currentChat.type === 'contact') {
                markMessagesAsRead(currentChat.id, 'contact');
            }
        } else {
            alert(data.error || data.message || 'Erreur lors de l\'envoi du message');
        }
    })
    .catch(error => {
        console.error('Erreur envoi message:', error);
        alert('Erreur lors de l\'envoi du message');
    });
}

// Marquer les messages comme lus
function markMessagesAsRead(chatId, chatType) {
    const formData = new URLSearchParams();
    formData.append('action', 'mark_as_read');
    formData.append('user_id', currentUser.id);
    
    if (chatType === 'contact') {
        formData.append('contact_id', chatId);
    } else if (chatType === 'group') {
        formData.append('group_id', chatId);
    }

    fetch('php/messages.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Actualiser la liste des discussions pour refléter les changements de statut
            loadChats();
        }
    })
    .catch(error => {
        console.error('Erreur marquage lu:', error);
    });
}

// Système de polling pour vérifier les nouveaux messages
let messagePollingInterval = null;

function startMessagePolling() {
    // Arrêter le polling existant
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }
    
    // Démarrer le nouveau polling (vérifier toutes les 5 secondes)
    messagePollingInterval = setInterval(() => {
        // Actualiser la liste des discussions
        loadChats();
        
        // Si un chat est ouvert, vérifier les nouveaux messages
        if (currentChat) {
            loadMessages(currentChat.id, currentChat.type);
        }
    }, 5000);
}

function stopMessagePolling() {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
        messagePollingInterval = null;
    }
}

// Démarrer le polling au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    startMessagePolling();
});

// Démarrer un chat avec un contact
function startChat(contact) {
    // Toujours prendre le contact à jour depuis la liste
    const upToDateContact = contacts.find(c => c.id === contact.id);
    openChat(upToDateContact || contact);
}

// Gérer l'upload de fichiers
function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    if (!currentChat) {
        alert('Veuillez sélectionner un chat pour envoyer des fichiers');
        return;
    }
    
    // Vérifier la taille et le type des fichiers
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip', 'application/rar'
    ];
    
    for (let file of files) {
        if (file.size > maxSize) {
            alert(`Le fichier "${file.name}" est trop volumineux (maximum 10MB)`);
            continue;
        }
        
        if (!allowedTypes.includes(file.type)) {
            alert(`Le type de fichier "${file.name}" n'est pas autorisé`);
            continue;
        }
        
        uploadFile(file);
    }
    
    // Réinitialiser l'input
    event.target.value = '';
}

// Uploader un fichier
function uploadFile(file) {
    if (!currentChat || !currentUser) {
        alert('Veuillez sélectionner un chat pour envoyer des fichiers');
        return;
    }
    
    // Afficher un message de progression
    const progressMessage = {
        id: 'temp-' + Date.now(),
        content: `📎 Envoi de "${file.name}" en cours...`,
        sender_id: currentUser.id,
        timestamp: new Date().toISOString(),
        status: 'sending',
        type: 'file',
        file_name: file.name,
        file_size: file.size
    };
    
    const messageElement = createMessageElement(progressMessage);
    document.getElementById('messagesArea').appendChild(messageElement);
    
    // Scroll vers le bas
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    // Préparer les données pour l'upload
    const formData = new FormData();
    formData.append('action', 'send_file');
    formData.append('sender_id', currentUser.id);
    formData.append('file', file);
    
    if (currentChat.type === 'group') {
        formData.append('group_id', currentChat.id);
        formData.append('receiver_id', '');
    } else {
        formData.append('receiver_id', currentChat.id);
        formData.append('group_id', '');
    }
    
    fetch('php/messages.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remplacer le message de progression par le vrai message
            const realMessage = {
                id: data.message_id,
                content: `📎 ${file.name}`,
                sender_id: currentUser.id,
                timestamp: new Date().toISOString(),
                status: 'sent',
                type: 'file',
                file_id: data.file_id,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type
            };
            
            // Supprimer le message de progression
            const progressElement = document.querySelector(`[data-message-id="temp-${progressMessage.id.split('-')[1]}"]`);
            if (progressElement) {
                progressElement.remove();
            }
            
            // Ajouter le vrai message
            const realMessageElement = createMessageElement(realMessage);
            document.getElementById('messagesArea').appendChild(realMessageElement);
            
            // Scroll vers le bas
            messagesArea.scrollTop = messagesArea.scrollHeight;
            
            // Actualiser la liste des discussions
            loadChats();
            
            addStatus(`✅ Fichier "${file.name}" envoyé avec succès`, 'success');
        } else {
            // Supprimer le message de progression et afficher l'erreur
            const progressElement = document.querySelector(`[data-message-id="temp-${progressMessage.id.split('-')[1]}"]`);
            if (progressElement) {
                progressElement.remove();
            }
            
            alert('Erreur upload: ' + (data.error || data.message || 'Erreur inconnue'));
        }
    })
    .catch(error => {
        console.error('Erreur upload fichier:', error);
        
        // Supprimer le message de progression
        const progressElement = document.querySelector(`[data-message-id="temp-${progressMessage.id.split('-')[1]}"]`);
        if (progressElement) {
            progressElement.remove();
        }
        
        alert('Erreur lors de l\'upload du fichier');
    });
}

// Améliorer createMessageElement pour gérer les fichiers
function createMessageElement(message) {
    const isSent = message.sender_id == currentUser.id;
    const div = document.createElement('div');
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    div.setAttribute('data-message-id', message.id);

    let senderName = '';
    if (currentChat && currentChat.type === 'group') {
        if (currentChat.members && Array.isArray(currentChat.members)) {
            const sender = currentChat.members.find(m => String(m.id) === String(message.sender_id));
            senderName = sender ? `<div class='sender-name'>${sender.name}</div>` : `<div class='sender-name'>Utilisateur ${message.sender_id}</div>`;
        } else {
            senderName = `<div class='sender-name'>Utilisateur ${message.sender_id}</div>`;
        }
    } else if (currentChat && currentChat.type === 'contact') {
        // Afficher le nom pour les discussions simples
        if (isSent) {
            senderName = `<div class='sender-name'>${currentUser.name || 'Moi'}</div>`;
        } else {
            // Chercher le nom du contact
            let contactName = currentChat.nickname || currentChat.name || 'Contact';
            senderName = `<div class='sender-name'>${contactName}</div>`;
        }
    }

    let content = '';
    if (message.type === 'file') {
        let fileIcon = getFileIcon(message.file_type || message.mime_type || 'other');
        let isImage = (message.file_type || message.mime_type || '').startsWith('image/');
        let iconHtml = fileIcon.icon.startsWith('fa')
            ? `<i class=\"fas ${fileIcon.icon}\" style=\"color:#FF4444;\"></i>`
            : `<span class=\"file-emoji\">${fileIcon.icon}</span>`;
        const fileSize = formatFileSize(message.file_size || 0);
        const fileName = message.file_name || message.content || 'Fichier';
        const downloadBtn = message.file_id ? `<button class=\"download-btn\" onclick=\"downloadFile('${message.file_id}')\" title=\"Télécharger\"><i class=\"fas fa-download\"></i></button>` : '';
        if (isImage && message.file_id) {
            // Affichage image avec aperçu + lightbox
            content = `
                <div class=\"message-bubble\">
                    ${senderName}
                    <div class=\"message-content file-message\" style=\"flex-direction:column;align-items:flex-start;\">
                        <img src=\"php/files.php?action=download&file_id=${message.file_id}\" alt=\"${fileName}\" class=\"message-image\" style=\"max-width:180px;max-height:160px;border-radius:8px;margin-bottom:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;\" onclick=\"showImageLightbox('php/files.php?action=download&file_id=${message.file_id}')\" title=\"Cliquez pour agrandir\">
                        <div style=\"display:flex;align-items:center;gap:8px;\">
                            <span class=\"file-name\">${fileName}</span>
                            <span class=\"file-size\">${fileSize}</span>
                            ${downloadBtn}
                        </div>
                    </div>
                    <div class=\"message-time\">${formatTime(message.timestamp)}</div>
                </div>
            `;
        } else {
            // Affichage fichier classique
            content = `
                <div class=\"message-bubble\">
                    ${senderName}
                    <div class=\"message-content file-message\">
                        <span class=\"file-icon\">${iconHtml}</span>
                        <span class=\"file-name\">${fileName}</span>
                        <span class=\"file-size\">${fileSize}</span>
                        ${downloadBtn}
                    </div>
                    <div class=\"message-time\">${formatTime(message.timestamp)}</div>
                </div>
            `;
        }
    } else {
        // Message texte normal
        content = `
            <div class="message-bubble">
                ${senderName}
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    }
    div.innerHTML = content;
    return div;
}

// Fonction pour obtenir l'icône du fichier
function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
        return { type: 'image', icon: '🖼️' };
    } else if (mimeType.startsWith('video/')) {
        return { type: 'video', icon: '🎥' };
    } else if (mimeType === 'application/pdf') {
        return { type: 'pdf', icon: '📄' };
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
        return { type: 'document', icon: '📝' };
    } else if (mimeType === 'text/plain') {
        return { type: 'text', icon: '📄' };
    } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
        return { type: 'archive', icon: '📦' };
    } else {
        return { type: 'other', icon: '📎' };
    }
}

// Fonction pour formater la taille du fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Fonction pour télécharger un fichier
function downloadFile(fileId) {
    // Créer un formulaire temporaire pour le téléchargement
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = 'php/files.php';
    
    const actionInput = document.createElement('input');
    actionInput.type = 'hidden';
    actionInput.name = 'action';
    actionInput.value = 'download';
    
    const fileIdInput = document.createElement('input');
    fileIdInput.type = 'hidden';
    fileIdInput.name = 'file_id';
    fileIdInput.value = fileId;
    
    form.appendChild(actionInput);
    form.appendChild(fileIdInput);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

// Fonction pour ajouter un statut (pour les tests)
function addStatus(message, type) {
    console.log(`${type.toUpperCase()}: ${message}`);
}

// Formater l'heure
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
        // Aujourd'hui
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        // Cette semaine
        return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
        // Plus ancien
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
}

// Fonctions pour les modals
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Rechercher des utilisateurs pour ajouter un contact
function searchUser() {
    const searchTerm = document.getElementById('searchUser').value.trim();
    if (!searchTerm) return;
    
    fetch(`php/user.php?action=get_all_users`)
        .then(response => response.json())
        .then(data => {
            const filtered = data.filter(user => 
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
            displaySearchResults(filtered);
        })
        .catch(error => {
            console.error('Erreur recherche:', error);
        });
}

// Afficher les résultats de recherche
function displaySearchResults(users) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = '<p>Aucun utilisateur trouvé</p>';
        return;
    }
    
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="user-name">${user.name}</div>
                    <div class="user-email">${user.email}</div>
                    <div class="user-phone">📱 ${user.phone || 'N/A'}</div>
                </div>
            </div>
            <button class="btn btn-primary" onclick="addContact('${user.id}')">Ajouter</button>
        `;
        container.appendChild(div);
    });
}

// Ajouter un contact
function addContact(userId) {
    fetch('php/contacts.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'add_contact',
            user_id: userId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Contact ajouté avec succès');
            closeModal('addContactModal');
            loadContacts();
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur ajout contact:', error);
    });
}

// Rechercher des membres pour créer un groupe
function searchGroupMembers() {
    const searchTerm = document.getElementById('searchGroupMembers').value.trim();
    if (!searchTerm) return;
    
    fetch(`php/user.php?action=get_all_users`)
        .then(response => response.json())
        .then(data => {
            const filtered = data.filter(user => 
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
            displayGroupMembersResults(filtered);
        })
        .catch(error => {
            console.error('Erreur recherche:', error);
        });
}

// Afficher les résultats de recherche pour les membres de groupe
function displayGroupMembersResults(users) {
    const container = document.getElementById('groupMembersResults');
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = '<p>Aucun utilisateur trouvé</p>';
        return;
    }
    
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="user-name">${user.name}</div>
                    <div class="user-email">${user.email}</div>
                </div>
            </div>
            <input type="checkbox" value="${user.email}" class="member-checkbox">
        `;
        container.appendChild(div);
    });
}

// Créer un groupe
function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    const members = Array.from(document.querySelectorAll('.member-checkbox:checked')).map(cb => cb.value);
    
    if (!name) {
        alert('Veuillez entrer un nom pour le groupe');
        return;
    }
    
    const groupData = {
        action: 'create_group',
        name: name,
        description: description,
        members: members
    };
    
    fetch('php/groups.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(groupData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Groupe créé avec succès');
            closeModal('createGroupModal');
            loadGroups();
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur création groupe:', error);
    });
}

// Variables globales pour les fichiers
let files = [];

// Charger les fichiers
function loadFiles() {
    fetch('php/files.php?action=get_files')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                files = data.files;
                displayFiles(files);
            }
        })
        .catch(error => {
            console.error('Erreur chargement fichiers:', error);
            document.getElementById('filesList').innerHTML = '<div class="error">Erreur de chargement</div>';
        });
}

// Afficher les fichiers
function displayFiles(filesList) {
    const container = document.getElementById('filesList');
    container.innerHTML = '';

    if (filesList.length === 0) {
        container.innerHTML = '<div class="no-items">Aucun fichier partagé</div>';
        return;
    }

    filesList.forEach(file => {
        const fileElement = createFileElement(file);
        container.appendChild(fileElement);
    });
}

// Créer un élément fichier
function createFileElement(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    const fileIcon = getFileIcon(file.mime_type);
    const fileSize = formatFileSize(file.file_size);
    const uploadDate = formatTime(file.uploaded_at);
    const recipient = file.receiver_name || file.group_name || 'Moi';
    
    div.innerHTML = `
        <div class="file-icon ${fileIcon.class}">
            <i class="${fileIcon.icon}"></i>
        </div>
        <div class="file-info">
            <div class="file-name">${file.original_name}</div>
            <div class="file-details">
                <div class="file-meta">
                    <span class="file-size">${fileSize}</span>
                    <span class="file-date">${uploadDate}</span>
                    <span class="file-downloads">${file.downloads} téléchargement(s)</span>
                </div>
                <div class="file-sender">Envoyé par: ${file.sender_name}</div>
                <div class="file-recipient">À: ${recipient}</div>
            </div>
        </div>
        <div class="file-actions">
            <button class="file-action-btn download" onclick="downloadFile('${file.id}')" title="Télécharger">
                <i class="fas fa-download"></i>
            </button>
            ${file.sender_id == currentUser.id ? 
                `<button class="file-action-btn delete" onclick="deleteFile('${file.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>` : ''
            }
        </div>
    `;
    
    return div;
}

// Obtenir l'icône du fichier selon son type
function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) {
        return { class: 'pdf', icon: 'fas fa-file-pdf' };
    } else if (mimeType.includes('image')) {
        return { class: 'image', icon: 'fas fa-file-image' };
    } else if (mimeType.includes('text') || mimeType.includes('document')) {
        return { class: 'document', icon: 'fas fa-file-alt' };
    } else {
        return { class: 'other', icon: 'fas fa-file' };
    }
}

// Formater la taille du fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Filtrer les fichiers
function filterFiles(searchTerm) {
    const filtered = files.filter(file => 
        file.original_name.toLowerCase().includes(searchTerm) ||
        file.sender_name.toLowerCase().includes(searchTerm)
    );
    displayFiles(filtered);
}

// Télécharger un fichier
function downloadFile(fileId) {
    // Créer un formulaire temporaire pour le téléchargement
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = 'php/files.php';
    
    const actionInput = document.createElement('input');
    actionInput.type = 'hidden';
    actionInput.name = 'action';
    actionInput.value = 'download';
    
    const fileIdInput = document.createElement('input');
    fileIdInput.type = 'hidden';
    fileIdInput.name = 'file_id';
    fileIdInput.value = fileId;
    
    form.appendChild(actionInput);
    form.appendChild(fileIdInput);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

// Supprimer un fichier
function deleteFile(fileId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
        return;
    }
    
    const formData = new FormData();
    formData.append('file_id', fileId);
    
    fetch('php/files.php?action=delete_file', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Fichier supprimé avec succès');
            loadFiles();
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur suppression fichier:', error);
    });
}

// Ouvrir les paramètres
function openSettings() {
    window.location.href = 'settings.html';
}

// Afficher le modal d'ajout de contact
function showAddContactModal() {
    showModal('addContactModal');
}

// Modifier un contact
function editContact(contactId, event) {
    event.stopPropagation();
    
    // Chercher le contact par contact_id ou id
    const contact = contacts.find(c => c.contact_id === contactId || c.id === contactId);
    
    if (contact) {
        // Remplir le modal avec les informations du contact
        document.getElementById('editContactId').value = contact.contact_id || contactId;
        document.getElementById('editContactName').value = contact.nickname || contact.name;
        showModal('editContactModal');
    } else {
        alert('Contact non trouvé');
    }
}

// Basculer le statut favori
function toggleFavorite(contactId, event) {
    event.stopPropagation();
    
    // Chercher le contact par contact_id ou id
    const contact = contacts.find(c => c.contact_id === contactId || c.id === contactId);
    const actualContactId = contact ? contact.contact_id : contactId;
    
    fetch('php/contacts.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'toggle_favorite',
            contact_id: actualContactId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadContacts(); // Recharger la liste
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur toggle favori:', error);
    });
}

// Supprimer un contact
function deleteContact(contactId, event) {
    event.stopPropagation();
    
    // Chercher le contact par contact_id ou id
    const contact = contacts.find(c => c.contact_id === contactId || c.id === contactId);
    const actualContactId = contact ? contact.contact_id : contactId;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
        return;
    }
    
    fetch('php/contacts.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'delete_contact',
            contact_id: actualContactId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadContacts(); // Recharger la liste
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur suppression contact:', error);
    });
}

// Sauvegarder les modifications d'un contact
function saveContactEdit() {
    const contactId = document.getElementById('editContactId').value;
    const nickname = document.getElementById('editContactName').value.trim();
    // On cherche le contact par contact_id
    const contact = contacts.find(c => c.contact_id === contactId);

    if (!nickname) {
        alert('Veuillez entrer un nom');
        return;
    }

    if (contact && contact.contact_id) {
        // Le contact existe déjà, on modifie directement
        updateContactNickname(contact.contact_id, nickname);
    } else {
        // Le contact n'existe pas, on l'ajoute d'abord
        // On doit trouver l'id utilisateur cible (c.id)
        const userId = contacts.find(c => c.id === contactId)?.id || contactId;
        fetch('php/contacts.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'add_contact',
                user_id: userId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.contact_id) {
                updateContactNickname(data.contact_id, nickname);
            } else {
                alert(data.message || 'Erreur lors de l\'ajout du contact');
            }
        })
        .catch(error => {
            console.error('Erreur ajout contact:', error);
            alert('Erreur lors de l\'ajout du contact');
        });
    }
}

function updateContactNickname(contactId, nickname) {
    fetch('php/contacts.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'update_contact',
            contact_id: contactId,
            nickname: nickname
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('editContactModal');
            loadContacts(); // Recharger la liste
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur modification contact:', error);
        alert('Erreur lors de la modification du contact');
    });
} 

// Afficher la liste des discussions (tous les contacts)
function displayDiscussions(contactsList) {
    const container = document.getElementById('discussionsList');
    container.innerHTML = '';
    if (contactsList.length === 0) {
        container.innerHTML = '<div class="no-items">Aucune discussion</div>';
        return;
    }
    contactsList.forEach(contact => {
        const discussionElement = createDiscussionElement(contact);
        container.appendChild(discussionElement);
    });
}

// Créer un élément discussion (pour chatter)
function createDiscussionElement(contact) {
    const div = document.createElement('div');
    div.className = 'contact-item';
    div.onclick = () => startChat(contact);
    const displayName = contact.nickname || contact.name;
    div.innerHTML = `
        <div class="contact-avatar">
            ${displayName.charAt(0).toUpperCase()}
        </div>
        <div class="contact-info">
            <div class="contact-name">${displayName}</div>
        </div>
    `;
    return div;
} 

// Fonction pour initialiser les événements du formulaire de contact
function initializeContactFormEvents() {
    const showBtn = document.getElementById('showAddContactFormBtn');
    const addContactForm = document.getElementById('addContactForm');
    const cancelBtn = document.getElementById('cancelAddContactBtn');
    const searchBtn = document.getElementById('searchContactBtn');
    
    if (showBtn && addContactForm) {
        // Supprimer les anciens événements en clonant l'élément
        const newShowBtn = showBtn.cloneNode(true);
        showBtn.parentNode.replaceChild(newShowBtn, showBtn);
        
        newShowBtn.addEventListener('click', function() {
            addContactForm.style.display = 'block';
            newShowBtn.style.display = 'none';
            // Vider les champs
            const phoneInput = document.getElementById('searchContactPhone');
            const resultsDiv = document.getElementById('searchContactResults');
            if (phoneInput) phoneInput.value = '';
            if (resultsDiv) resultsDiv.innerHTML = '';
        });
    }
    
    if (cancelBtn && addContactForm) {
        // Supprimer les anciens événements en clonant l'élément
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newCancelBtn.addEventListener('click', function() {
            addContactForm.style.display = 'none';
            const showBtn = document.getElementById('showAddContactFormBtn');
            if (showBtn) showBtn.style.display = 'block';
        });
    }
    
    if (searchBtn) {
        // Supprimer les anciens événements en clonant l'élément
        const newSearchBtn = searchBtn.cloneNode(true);
        searchBtn.parentNode.replaceChild(newSearchBtn, searchBtn);
        
        newSearchBtn.addEventListener('click', function() {
            searchContactUser();
        });
    }
    
    // Permettre la recherche avec Entrée
    const phoneInput = document.getElementById('searchContactPhone');
    
    if (phoneInput) {
        // Supprimer les anciens événements
        const newPhoneInput = phoneInput.cloneNode(true);
        phoneInput.parentNode.replaceChild(newPhoneInput, phoneInput);
        
        newPhoneInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchContactUser();
            }
        });
    }
}

// Gestion du formulaire d'ajout de contact dans l'onglet Contacts
window.addEventListener('DOMContentLoaded', function() {
    initializeContactFormEvents();
});

// Fonction pour rechercher un utilisateur à ajouter comme contact
function searchContactUser() {
    const phone = document.getElementById('searchContactPhone').value.trim();
    const resultsDiv = document.getElementById('searchContactResults');
    
    if (!phone) {
        resultsDiv.innerHTML = '<div style="color: #e74c3c; padding: 10px;">Veuillez entrer un numéro de téléphone</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Recherche en cours...</div>';
    
    fetch('php/contacts.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'check_user',
            phone: phone
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Utilisateur trouvé, afficher le formulaire d'ajout avec surnom personnalisé
            resultsDiv.innerHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 10px; margin-top: 10px;">
                    <div style="font-weight: bold; color: #155724;">Utilisateur trouvé !</div>
                    <div style="margin: 5px 0;">Nom: ${data.user_name}</div>
                    <div style="margin: 5px 0;">Téléphone: ${data.user_phone}</div>
                    <div style="margin: 5px 0;">Email: ${data.user_email}</div>
                    
                    <div style="margin-top: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Surnom personnalisé (optionnel):</label>
                        <input type="text" id="customNickname" placeholder="Entrez un surnom personnalisé" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn btn-success" onclick="addContactFromSearch('${data.user_id}')">
                                <i class="fas fa-plus"></i> Ajouter aux contacts
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="cancelAddContact()">
                                <i class="fas fa-times"></i> Annuler
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = `<div style="color: #e74c3c; padding: 10px;">${data.message}</div>`;
        }
    })
    .catch(error => {
        console.error('Erreur recherche utilisateur:', error);
        resultsDiv.innerHTML = '<div style="color: #e74c3c; padding: 10px;">Erreur lors de la recherche</div>';
    });
}

// Fonction pour ajouter un contact depuis la recherche
function addContactFromSearch(userId) {
    const customNickname = document.getElementById('customNickname')?.value.trim() || '';
    
    console.log('Ajout de contact:', { userId, customNickname });
    
    // Afficher un indicateur de chargement
    const resultsDiv = document.getElementById('searchContactResults');
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Ajout du contact en cours...</div>';
    
    fetch('php/contacts.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'add_contact',
            user_id: userId,
            nickname: customNickname
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Réponse ajout contact:', data);
        if (data.success) {
            // Masquer le formulaire et recharger les contacts
            document.getElementById('addContactForm').style.display = 'none';
            document.getElementById('showAddContactFormBtn').style.display = 'block';
            
            // Vider les résultats de recherche
            resultsDiv.innerHTML = '';
            
            // Afficher un message de succès temporaire avec animation
            const nicknameText = customNickname ? ` avec le surnom "${customNickname}"` : '';
            resultsDiv.innerHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; color: #155724; animation: fadeIn 0.5s ease;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-check-circle" style="font-size: 20px; color: #28a745;"></i>
                        <div>
                            <div style="font-weight: bold; margin-bottom: 5px;">✅ Contact ajouté avec succès !</div>
                            <div style="font-size: 14px;">Le contact apparaîtra dans votre liste ci-dessous.</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Recharger immédiatement les contacts pour voir le nouveau contact en bas
            console.log('Rechargement des contacts après ajout...');
            
            // Attendre un peu pour s'assurer que le contact est bien ajouté dans le XML
            setTimeout(() => {
                loadContacts();
                
                // Marquer le nouveau contact après le rechargement
                setTimeout(() => {
                    const contactsContainer = document.getElementById('contactsListContainer');
                    if (contactsContainer) {
                        const lastContact = contactsContainer.querySelector('.contact-item:last-child');
                        if (lastContact) {
                            // Ajouter la classe pour le style spécial
                            lastContact.classList.add('new-contact');
                            
                            // Ajouter une animation de pulsation
                            lastContact.style.animation = 'pulse 2s ease-in-out';
                            
                            // Faire défiler vers le nouveau contact
                            lastContact.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            // Retirer les classes après 3 secondes
                            setTimeout(() => {
                                lastContact.classList.remove('new-contact');
                                lastContact.style.animation = '';
                            }, 3000);
                        }
                    }
                }, 100);
            }, 500);
            
            // Masquer le message de succès après 4 secondes
            setTimeout(() => {
                resultsDiv.innerHTML = '';
            }, 4000);
        } else {
            // Afficher l'erreur avec un style approprié
            resultsDiv.innerHTML = `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; color: #721c24; animation: fadeIn 0.5s ease;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 20px; color: #dc3545;"></i>
                        <div>
                            <div style="font-weight: bold; margin-bottom: 5px;">❌ Erreur lors de l'ajout</div>
                            <div style="font-size: 14px;">${data.message}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Erreur ajout contact:', error);
        resultsDiv.innerHTML = `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; color: #721c24; animation: fadeIn 0.5s ease;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 20px; color: #dc3545;"></i>
                    <div>
                        <div style="font-weight: bold; margin-bottom: 5px;">❌ Erreur de connexion</div>
                        <div style="font-size: 14px;">Impossible de se connecter au serveur. Veuillez réessayer.</div>
                    </div>
                </div>
            </div>
        `;
    });
}

// Fonction pour annuler l'ajout de contact
function cancelAddContact() {
    const resultsDiv = document.getElementById('searchContactResults');
    resultsDiv.innerHTML = '';
}

// ===== FONCTIONS DE GESTION DES GROUPES =====

// Initialiser les événements du formulaire de création de groupe
function initializeGroupFormEvents() {
    // Bouton pour afficher le formulaire de création
    const showFormBtn = document.getElementById('showCreateGroupFormBtn');
    if (showFormBtn) {
        showFormBtn.onclick = showCreateGroupForm;
    }
    
    // Bouton pour masquer le formulaire
    const cancelBtn = document.getElementById('cancelCreateGroupBtn');
    if (cancelBtn) {
        cancelBtn.onclick = hideCreateGroupForm;
    }
    
    // Bouton pour créer le groupe
    const createBtn = document.getElementById('createGroupBtn');
    if (createBtn) {
        createBtn.onclick = createGroup;
    }
}

// Afficher le formulaire de création de groupe
function showCreateGroupForm() {
    const form = document.getElementById('createGroupForm');
    if (form) {
        form.style.display = 'block';
        loadContactsForGroup();
    }
}

// Masquer le formulaire de création de groupe
function hideCreateGroupForm() {
    const form = document.getElementById('createGroupForm');
    if (form) {
        form.style.display = 'none';
        document.getElementById('groupName').value = '';
        document.getElementById('groupDescription').value = '';
        document.getElementById('groupContactsList').innerHTML = '';
    }
}

// Charger les contacts pour la création de groupe
function loadContactsForGroup() {
    fetch('php/contacts.php?action=get_contacts')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayContactsForGroup(data.contacts);
            } else {
                console.error('Erreur chargement contacts:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur chargement contacts:', error);
        });
}

// Afficher les contacts pour la sélection de groupe
function displayContactsForGroup(contacts) {
    const container = document.getElementById('groupContactsList');
    
    if (contacts.length === 0) {
        container.innerHTML = '<div class="no-contacts">Aucun contact disponible</div>';
        return;
    }
    
    const contactsHtml = contacts.map(contact => `
        <div class="contact-checkbox">
            <input type="checkbox" id="contact_${contact.id}" value="${contact.id}" data-name="${contact.name}">
            <label for="contact_${contact.id}">
                ${contact.name} (${contact.phone})
            </label>
        </div>
    `).join('');
    
    container.innerHTML = contactsHtml;
}

// Créer un groupe
function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    
    if (!name) {
        alert('Le nom du groupe est requis');
        return;
    }
    
    // Récupérer les contacts sélectionnés
    const selectedContacts = [];
    document.querySelectorAll('#groupContactsList input[type="checkbox"]:checked').forEach(checkbox => {
        selectedContacts.push(checkbox.value);
    });
    
    if (selectedContacts.length < 2) {
        alert('Vous devez sélectionner au moins 2 contacts pour créer un groupe');
        return;
    }
    
    const groupData = {
        action: 'create_group',
        name: name,
        description: description,
        member_ids: selectedContacts
    };
    
    fetch('php/groups.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(groupData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Groupe créé avec succès !');
            hideCreateGroupForm();
            loadGroups(); // Recharger la liste des groupes
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur création groupe:', error);
        alert('Erreur lors de la création du groupe');
    });
}

// Ouvrir un groupe
function openGroup(group) {
    console.log('Ouverture du groupe:', group);
    
    // Charger les détails du groupe
    fetch(`php/groups.php?action=get_group_details&group_id=${group.id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentGroup = data.group;
                displayGroupDetails(currentGroup);
            } else {
                console.error('Erreur chargement détails groupe:', data.message);
                alert('Erreur: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erreur ouverture groupe:', error);
            alert('Erreur lors de l\'ouverture du groupe');
        });
}

// Afficher les détails d'un groupe
function displayGroupDetails(group) {
    const mainContent = document.querySelector('.main-content');
    
    const membersList = group.members.map(member => `
        <div class="member-item">
            <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
            <div class="member-info">
                <div class="member-name">${member.name} ${member.is_admin ? '<span class="admin-badge">👑</span>' : ''}</div>
                <div class="member-status">${member.online ? '🟢 En ligne' : '🔴 Hors ligne'}</div>
                <div class="member-joined">Rejoint le ${formatDate(member.joined_at)}</div>
            </div>
            ${group.can_manage && !member.is_admin ? `
                <button class="member-action-btn remove" onclick="removeMember('${group.id}', '${member.id}')" title="Retirer du groupe">
                    <i class="fas fa-user-minus"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
    
    mainContent.innerHTML = `
        <div class="group-details">
            <div class="group-header">
                <h2>${group.name}</h2>
                <p>${group.description || 'Aucune description'}</p>
                <div class="group-stats">
                    <span>👤 ${group.members.length} membre(s)</span>
                    <span>📅 Créé le ${formatDate(group.created_at)}</span>
                </div>
            </div>
            
            <div class="group-actions-bar">
                ${group.can_manage ? `
                    <button class="btn btn-primary" onclick="editGroupInfo('${group.id}')">
                        <i class="fas fa-edit"></i> Modifier le groupe
                    </button>
                    <button class="btn btn-success" onclick="addMemberToGroup('${group.id}')">
                        <i class="fas fa-user-plus"></i> Ajouter un membre
                    </button>
                ` : ''}
                <button class="btn btn-warning" onclick="leaveGroup('${group.id}')">
                    <i class="fas fa-sign-out-alt"></i> Quitter le groupe
                </button>
                ${group.can_manage && group.members.length <= 1 ? `
                    <button class="btn btn-danger" onclick="deleteGroup('${group.id}')">
                        <i class="fas fa-trash"></i> Supprimer le groupe
                    </button>
                ` : ''}
            </div>
            
            <div class="group-members-section">
                <h3>👥 Membres du groupe</h3>
                <div class="members-list">
                    ${membersList}
                </div>
            </div>
        </div>
    `;
}

// Modifier les informations du groupe
function editGroupInfo(groupId) {
    if (!currentGroup) return;
    
    const newName = prompt('Nouveau nom du groupe:', currentGroup.name);
    if (!newName || newName.trim() === '') return;
    
    const newDescription = prompt('Nouvelle description du groupe:', currentGroup.description || '');
    
    const updateData = {
        action: 'update_group',
        group_id: groupId,
        name: newName.trim(),
        description: newDescription.trim()
    };
    
    fetch('php/groups.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Groupe modifié avec succès !');
            loadGroups(); // Recharger la liste des groupes
            if (currentGroup && currentGroup.id === groupId) {
                openGroup({ id: groupId }); // Recharger les détails du groupe
            }
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur modification groupe:', error);
        alert('Erreur lors de la modification du groupe');
    });
}

// Ajouter un membre au groupe
function addMemberToGroup(groupId) {
    if (!currentGroup) return;
    
    // Charger les contacts disponibles
    fetch(`php/groups.php?action=get_available_contacts&group_id=${groupId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.contacts.length === 0) {
                    alert('Aucun contact disponible à ajouter');
                    return;
                }
                
                const contactNames = data.contacts.map(c => c.name).join('\n');
                const contactId = prompt(`Contacts disponibles:\n${contactNames}\n\nEntrez l'ID du contact à ajouter:`, '');
                
                if (contactId) {
                    addMember(groupId, contactId);
                }
            } else {
                alert('Erreur: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erreur chargement contacts:', error);
            alert('Erreur lors du chargement des contacts');
        });
}

// Ajouter un membre
function addMember(groupId, memberId) {
    const addData = {
        action: 'add_member',
        group_id: groupId,
        member_id: memberId
    };
    
    fetch('php/groups.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(addData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Membre ajouté avec succès !');
            if (currentGroup && currentGroup.id === groupId) {
                openGroup({ id: groupId }); // Recharger les détails du groupe
            }
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur ajout membre:', error);
        alert('Erreur lors de l\'ajout du membre');
    });
}

// Retirer un membre
function removeMember(groupId, memberId) {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre du groupe ?')) {
        return;
    }
    
    const removeData = {
        action: 'remove_member',
        group_id: groupId,
        member_id: memberId
    };
    
    fetch('php/groups.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(removeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Membre retiré avec succès !');
            if (currentGroup && currentGroup.id === groupId) {
                openGroup({ id: groupId }); // Recharger les détails du groupe
            }
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur retrait membre:', error);
        alert('Erreur lors du retrait du membre');
    });
}

// Quitter le groupe
function leaveGroup(groupId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Êtes-vous sûr de vouloir quitter ce groupe ?')) {
        return;
    }
    
    const leaveData = {
        action: 'leave_group',
        group_id: groupId
    };
    
    fetch('php/groups.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(leaveData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Vous avez quitté le groupe');
            loadGroups(); // Recharger la liste des groupes
            // Retourner à la vue principale
            const mainContent = document.querySelector('.main-content');
            mainContent.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">💬</div>
                    <h2>Bienvenue sur Chat Platform</h2>
                    <p>Sélectionnez un groupe pour commencer une discussion</p>
                </div>
            `;
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur quitter groupe:', error);
        alert('Erreur lors de la sortie du groupe');
    });
}

// Supprimer le groupe
function deleteGroup(groupId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible.')) {
        return;
    }
    
    const deleteData = {
        action: 'delete_group',
        group_id: groupId
    };
    
    fetch('php/groups.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(deleteData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Groupe supprimé avec succès !');
            loadGroups(); // Recharger la liste des groupes
            // Retourner à la vue principale
            const mainContent = document.querySelector('.main-content');
            mainContent.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">💬</div>
                    <h2>Bienvenue sur Chat Platform</h2>
                    <p>Sélectionnez un groupe pour commencer une discussion</p>
                </div>
            `;
        } else {
            alert('Erreur: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur suppression groupe:', error);
        alert('Erreur lors de la suppression du groupe');
    });
}

// Gérer les membres du groupe
function manageGroupMembers(groupId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    // Ouvrir directement la modale de gestion des membres
    openManageMembersModal(groupId);
}

// Formater une date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Fonction pour créer la modale si elle n'existe pas
function ensureManageMembersModalExists() {
    if (!document.getElementById('manageMembersModal')) {
        const modal = document.createElement('div');
        modal.id = 'manageMembersModal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
          <div class="modal-content" style="max-width:500px; position:relative;">
            <span class="close-btn" onclick="closeManageMembersModal()">&times;</span>
            <h3>Gérer les membres du groupe</h3>
            <div id="membersList"></div>
            <hr>
            <h4>Ajouter un membre</h4>
            <div id="addMemberList"></div>
          </div>
        `;
        document.body.appendChild(modal);
    }
}

function openManageMembersModal(groupId) {
    // S'assurer que la modale existe
    ensureManageMembersModalExists();
    
    // Charger les membres actuels
    fetch(`php/groups.php?action=get_group_details&group_id=${groupId}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const group = data.group;
                let html = '';
                group.members.forEach(member => {
                    html += `<div style='margin-bottom:6px; padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;'>
                        <span>${member.name} ${member.is_admin ? '👑' : ''}</span>
                        ${group.can_manage && !member.is_admin && member.id !== group.created_by ? 
                            `<button onclick="removeMemberModal('${group.id}', '${member.id}')" style='margin-left:10px; background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;'>Retirer</button>` : 
                            '<span style="color: #666;">' + (member.is_admin ? '(Admin)' : '(Membre)') + '</span>'}
                    </div>`;
                });
                document.getElementById('membersList').innerHTML = html;
            }
        })
        .catch(error => {
            console.error('Erreur chargement membres:', error);
            document.getElementById('membersList').innerHTML = '<div style="color: red;">Erreur de chargement des membres</div>';
        });

    // Charger les contacts disponibles à ajouter
    fetch(`php/groups.php?action=get_available_contacts&group_id=${groupId}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                let html = '';
                if (data.contacts.length === 0) {
                    html = "<em>Aucun contact à ajouter</em>";
                } else {
                    data.contacts.forEach(contact => {
                        html += `<div style='margin-bottom:6px; padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;'>
                            <span>${contact.name} (${contact.phone})</span>
                            <button onclick="addMemberModal('${groupId}', '${contact.id}')" style='background:#28a745; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;'>Ajouter</button>
                        </div>`;
                    });
                }
                document.getElementById('addMemberList').innerHTML = html;
            }
        })
        .catch(error => {
            console.error('Erreur chargement contacts:', error);
            document.getElementById('addMemberList').innerHTML = '<div style="color: red;">Erreur de chargement des contacts</div>';
        });

    document.getElementById('manageMembersModal').style.display = 'flex';
}

function closeManageMembersModal() {
    document.getElementById('manageMembersModal').style.display = 'none';
}

// Version modale des fonctions d'ajout/retrait (rafraîchit la modale)
function addMemberModal(groupId, memberId) {
    const addData = {
        action: 'add_member',
        group_id: groupId,
        member_id: memberId
    };
    fetch('php/groups.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(addData)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            openManageMembersModal(groupId);
        } else {
            alert(data.message);
        }
    });
}

function removeMemberModal(groupId, memberId) {
    if (!confirm('Retirer ce membre du groupe ?')) return;
    fetch('php/groups.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'remove_member', group_id: groupId, member_id: memberId})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            openManageMembersModal(groupId);
        } else {
            alert(data.message);
        }
    });
}

// Ajoute le bouton dans displayGroupDetails
const oldDisplayGroupDetails = displayGroupDetails;
displayGroupDetails = function(group) {
    oldDisplayGroupDetails(group);
    if (group.can_manage) {
        const mainContent = document.querySelector('.main-content .group-details .group-header');
        if (mainContent && !document.getElementById('btnManageMembers')) {
            const btn = document.createElement('button');
            btn.id = 'btnManageMembers';
            btn.className = 'btn btn-info';
            btn.innerHTML = '<i class="fas fa-users-cog"></i> Gérer les membres';
            btn.onclick = function() { openManageMembersModal(group.id); };
            mainContent.appendChild(btn);
        }
    }
};

// Ajout de l'écouteur pour le bouton Ajouter discussion
function initializeDiscussionAddButton() {
    const btn = document.getElementById('addDiscussionBtn');
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            showAddDiscussionModal();
        });
    }
}

// Appeler cette fonction à la fin de initializeEventListeners
const oldInit = initializeEventListeners;
initializeEventListeners = function() {
    oldInit();
    initializeDiscussionAddButton();
}

// Afficher la modale de sélection discussion
function showAddDiscussionModal() {
    // Afficher les contacts
    const contactsList = document.getElementById('discussionContactsList');
    if (contactsList) {
        let html = '';
        if (contacts.length === 0) {
            html = '<div style="color:#888;">Aucun contact ajouté</div>';
        } else {
            contacts.forEach(contact => {
                html += `<div class='contact-item' style='cursor:pointer; padding:8px; border-bottom:1px solid #eee;' onclick='startChatFromModal(${JSON.stringify(contact)})'>
                    <span>${contact.name || contact.nickname || contact.phone}</span>
                </div>`;
            });
        }
        contactsList.innerHTML = html;
    }
    // Afficher les groupes
    const groupsList = document.getElementById('discussionGroupsList');
    if (groupsList) {
        let html = '';
        if (groups.length === 0) {
            html = '<div style="color:#888;">Aucun groupe</div>';
        } else {
            groups.forEach(group => {
                html += `<div class='group-item' style='cursor:pointer; padding:8px; border-bottom:1px solid #eee;' onclick='openGroupFromModal(${JSON.stringify(group)})'>
                    <span>${group.name}</span>
                </div>`;
            });
        }
        groupsList.innerHTML = html;
    }
    document.getElementById('addDiscussionModal').style.display = 'flex';
}

// Fermer la modale (utilise déjà closeModal)

// Démarrer une discussion depuis la modale
function startChatFromModal(contactObj) {
    closeModal('addDiscussionModal');
    // Trouver le contact dans la liste réelle (pour éviter les problèmes de référence)
    const c = contacts.find(ct => ct.id == contactObj.id || ct.contact_id == contactObj.id);
    if (c) {
        startChat(c);
    }
}

// Ouvrir la gestion du groupe depuis la modale
function openGroupFromModal(groupObj) {
    openChat({ ...groupObj, type: 'group', is_member: true });
}