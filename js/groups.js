// Gestion des groupes
let currentGroups = [];
let currentGroup = null;

// Charger les groupes de l'utilisateur
function loadGroups() {
    console.log('Chargement des groupes...');
    
    fetch('php/groups.php?action=get_user_groups')
        .then(response => response.json())
        .then(data => {
            console.log('Réponse API groupes:', data);
            if (data.success) {
                currentGroups = data.groups;
                console.log('Groupes chargés:', currentGroups);
                displayGroups(currentGroups);
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
    div.onclick = () => openGroup(group);
    
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
                <button class="group-action-btn edit" onclick="editGroup('${group.id}', event)" title="Modifier le groupe">
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
                <div class="member-status">Rejoint le ${formatDate(member.joined_at)}</div>
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
                    <h2>Bienvenue sur Diotaye Bii</h2>
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
                    <h2>Bienvenue sur Diotaye Bii</h2>
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
    
    if (currentGroup && currentGroup.id === groupId) {
        // Afficher une interface de gestion des membres
        alert('Utilisez les boutons dans les détails du groupe pour gérer les membres');
    }
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

// Filtrer les groupes
function filterGroups(searchTerm) {
    const filtered = currentGroups.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    displayGroups(filtered);
} 