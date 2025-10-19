// Variables globales
let employees = JSON.parse(localStorage.getItem('employees')) || [];
let leaveRequests = JSON.parse(localStorage.getItem('leaveRequests')) || [];
let leaveBalances = JSON.parse(localStorage.getItem('leaveBalances')) || {};
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let userType = localStorage.getItem('userType') || null;
let currentEditingEmployeeIndex = null;

// Configuration de sécurité
let securityConfig = JSON.parse(localStorage.getItem('securityConfig')) || {
    rhPassword: 'admin123',
    employeePasswords: {}
};

// Types de congé
const leaveTypes = {
    'annuel': 'Congé annuel',
    'maladie': 'Congé de maladie',
    'longue-duree': 'Congé de longue durée',
    'maternite': 'Congé de maternité',
    'recuperation': 'Congé de récupération',
    'radio': 'Congé de radio',
    'certificat': 'Certificat d\'accompagnement',
    'sans-solde': 'Congé sans solde',
    'exceptionnel': 'Congé exceptionnel'
};

// Grades
const grades = {
    'medecin-generaliste': 'Médecin Généraliste',
    'infirmier': 'Infirmier',
    'technicien-radio': 'Technicien en Radiologie',
    'radiologue': 'Radiologue',
    'sage-femme': 'Sage-Femme',
    'kinesitherapeute': 'Kinésithérapeute',
    'secretaire-medical': 'Secrétaire Médical',
    'aide-soignant': 'Aide-Soignant',
    'technicien-laboratoire': 'Technicien de Laboratoire'
};

const radioGrades = ['technicien-radio', 'radiologue'];

// Initialisation des données
function initializeData() {
    if (!localStorage.getItem('appInitialized')) {
        console.log("Initialisation des données...");
        
        const initialEmployees = [
            { 
                firstname: "Jean", 
                lastname: "Dupont", 
                email: "jean.dupont@centretrad.com", 
                grade: "medecin-generaliste", 
                hireDate: "2022-01-15",
                address: "123 Rue Principale, Tunis",
                phone: "+216 12 345 678",
                initialBalance: 30 
            },
            { 
                firstname: "Marie", 
                lastname: "Martin", 
                email: "marie.martin@centretrad.com", 
                grade: "infirmier", 
                hireDate: "2021-03-20",
                address: "456 Avenue Habib Bourguiba, Tunis",
                phone: "+216 98 765 432",
                initialBalance: 30 
            },
            { 
                firstname: "Pierre", 
                lastname: "Durand", 
                email: "pierre.durand@centretrad.com", 
                grade: "technicien-radio", 
                hireDate: "2020-06-10",
                address: "789 Boulevard de la Liberté, Tunis",
                phone: "+216 55 444 333",
                initialBalance: 30 
            }
        ];

        // Initialiser securityConfig s'il n'existe pas
        if (!localStorage.getItem('securityConfig')) {
            securityConfig = {
                rhPassword: 'admin123',
                employeePasswords: {}
            };
            
            // Initialiser les mots de passe employés
            initialEmployees.forEach(employee => {
                securityConfig.employeePasswords[employee.email] = '1234';
            });
            
            localStorage.setItem('securityConfig', JSON.stringify(securityConfig));
        }

        // Initialiser les autres données
        localStorage.setItem('employees', JSON.stringify(initialEmployees));
        localStorage.setItem('leaveRequests', JSON.stringify([]));
        localStorage.setItem('leaveBalances', JSON.stringify({}));
        localStorage.setItem('appInitialized', 'true');
        
        console.log("✅ Base de données initialisée avec", initialEmployees.length, "employés");
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    initializeData();
    
    // Recharger les données depuis le localStorage
    employees = JSON.parse(localStorage.getItem('employees')) || [];
    leaveRequests = JSON.parse(localStorage.getItem('leaveRequests')) || [];
    leaveBalances = JSON.parse(localStorage.getItem('leaveBalances')) || {};
    securityConfig = JSON.parse(localStorage.getItem('securityConfig')) || {
        rhPassword: 'admin123',
        employeePasswords: {}
    };
    
    // Initialiser les soldes des employés existants
    employees.forEach((employee, index) => {
        if (!leaveBalances[index]) {
            initializeEmployeeBalance(index, employee.initialBalance || 30);
        }
    });
    
    // Vérifier si un utilisateur est déjà connecté
    if (userType && currentUser) {
        if (userType === 'rh') {
            showRHInterface();
        } else if (userType === 'employee') {
            showEmployeeInterface();
        }
    } else {
        showLoginSelection();
    }
    
    // Initialiser les interfaces
    populateEmployeeLoginDropdown();
    populateGradeDropdowns();
    populateNewGradeDropdown();
    populateResetEmployeeDropdown();
    loadEmployees();
    loadLeaveRequests();
    updateDashboard();
    
    // Ajouter les écouteurs d'événements
    document.getElementById('rh-login').addEventListener('submit', handleRHLogin);
    document.getElementById('employee-login').addEventListener('submit', handleEmployeeLogin);
    document.getElementById('employee-form').addEventListener('submit', handleAddEmployee);
    document.getElementById('employee-leave-request-form').addEventListener('submit', handleLeaveRequest);
}

// ==================== GESTION DE LA CONNEXION ====================

function showLoginSelection() {
    document.getElementById('login-selection').style.display = 'block';
    document.getElementById('main-login').style.display = 'none';
    document.getElementById('rh-interface').style.display = 'none';
    document.getElementById('employee-interface').style.display = 'none';
}

function showLoginForm(type) {
    document.getElementById('login-selection').style.display = 'none';
    document.getElementById('main-login').style.display = 'block';
    
    document.querySelectorAll('.user-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activer le bon bouton
    if (type === 'rh') {
        document.querySelector('.user-type-btn:nth-child(1)').classList.add('active');
        document.getElementById('rh-login-form').style.display = 'block';
        document.getElementById('employee-login-form').style.display = 'none';
        document.getElementById('login-title').textContent = '🔐 Connexion RH';
    } else {
        document.querySelector('.user-type-btn:nth-child(2)').classList.add('active');
        document.getElementById('rh-login-form').style.display = 'none';
        document.getElementById('employee-login-form').style.display = 'block';
        document.getElementById('login-title').textContent = '🔐 Connexion Employé';
    }
    
    document.getElementById('login-alert').style.display = 'none';
}

// Connexion RH
function handleRHLogin(e) {
    e.preventDefault();
    const username = document.getElementById('rh-username').value;
    const password = document.getElementById('rh-password').value;
    
    if (username === 'admin' && password === securityConfig.rhPassword) {
        userType = 'rh';
        currentUser = { name: 'Administrateur RH' };
        localStorage.setItem('userType', userType);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showRHInterface();
    } else {
        showLoginAlert('❌ Identifiants RH incorrects');
    }
}

// Connexion Employé
function handleEmployeeLogin(e) {
    e.preventDefault();
    const employeeIndex = document.getElementById('employee-select').value;
    const password = document.getElementById('employee-password').value;
    
    if (!employeeIndex) {
        showLoginAlert('❌ Veuillez sélectionner votre nom');
        return;
    }
    
    const employee = employees[employeeIndex];
    const storedPassword = securityConfig.employeePasswords[employee.email];
    
    if (password === storedPassword) {
        currentUser = employee;
        userType = 'employee';
        localStorage.setItem('userType', userType);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showEmployeeInterface();
    } else {
        showLoginAlert('❌ Mot de passe incorrect');
    }
}

function showLoginAlert(message) {
    const alert = document.getElementById('login-alert');
    alert.textContent = message;
    alert.style.display = 'block';
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

function logout() {
    currentUser = null;
    userType = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userType');
    showLoginSelection();
}

function showRHInterface() {
    document.getElementById('login-selection').style.display = 'none';
    document.getElementById('main-login').style.display = 'none';
    document.getElementById('rh-interface').style.display = 'block';
    document.getElementById('employee-interface').style.display = 'none';
    document.getElementById('connected-rh-name').textContent = 'Administrateur RH';
    updateDashboard();
}

function showEmployeeInterface() {
    document.getElementById('login-selection').style.display = 'none';
    document.getElementById('main-login').style.display = 'none';
    document.getElementById('rh-interface').style.display = 'none';
    document.getElementById('employee-interface').style.display = 'block';
    updateEmployeeInterface();
}

// ==================== GESTION DU PERSONNEL ====================

function showAddEmployeeForm() {
    document.getElementById('employee-modal').style.display = 'block';
}

function hideAddEmployeeForm() {
    document.getElementById('employee-modal').style.display = 'none';
    document.getElementById('employee-form').reset();
}

function populateNewGradeDropdown() {
    const dropdown = document.getElementById('new-grade');
    dropdown.innerHTML = '<option value="">Sélectionner un grade</option>';
    Object.keys(grades).forEach(gradeKey => {
        const option = document.createElement('option');
        option.value = gradeKey;
        option.textContent = grades[gradeKey];
        dropdown.appendChild(option);
    });
}

// Ajouter un employé
function handleAddEmployee(e) {
    e.preventDefault();
    
    const newEmployee = {
        firstname: document.getElementById('new-firstname').value,
        lastname: document.getElementById('new-lastname').value,
        email: document.getElementById('new-email').value,
        grade: document.getElementById('new-grade').value,
        hireDate: document.getElementById('new-hire-date').value,
        address: document.getElementById('new-address').value,
        phone: document.getElementById('new-phone').value,
        initialBalance: parseInt(document.getElementById('new-initial-balance').value)
    };
    
    // Vérifier si l'email existe déjà
    const emailExists = employees.some(emp => emp.email === newEmployee.email);
    if (emailExists) {
        alert('❌ Un employé avec cet email existe déjà');
        return;
    }
    
    employees.push(newEmployee);
    const employeeIndex = employees.length - 1;
    
    // Initialiser le solde
    initializeEmployeeBalance(employeeIndex, newEmployee.initialBalance);
    
    // Initialiser le mot de passe
    securityConfig.employeePasswords[newEmployee.email] = '1234';
    
    // Sauvegarder
    localStorage.setItem('employees', JSON.stringify(employees));
    localStorage.setItem('leaveBalances', JSON.stringify(leaveBalances));
    localStorage.setItem('securityConfig', JSON.stringify(securityConfig));
    
    // Mettre à jour l'interface
    loadEmployees();
    populateEmployeeLoginDropdown();
    populateResetEmployeeDropdown();
    updateDashboard();
    
    hideAddEmployeeForm();
    alert('✅ Employé ajouté avec succès ! Mot de passe initial : 1234');
}

function loadEmployees() {
    const employeesList = document.getElementById('employees-list');
    employeesList.innerHTML = '';
    
    if (employees.length === 0) {
        employeesList.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Aucun employé enregistré</td></tr>';
        return;
    }
    
    employees.forEach((employee, index) => {
        const balance = calculateEmployeeLeaveBalance(index);
        const isRadio = isRadioPersonnel(employee);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employee.lastname}</td>
            <td>${employee.firstname}</td>
            <td>${employee.email}</td>
            <td><span class="grade-badge">${grades[employee.grade] || employee.grade}</span></td>
            <td>${employee.hireDate}</td>
            <td>
                <span class="${balance.annual.remaining < 5 ? 'balance-negative' : 'balance-positive'}">
                    ${balance.annual.remaining} jours
                </span>
                ${isRadio ? `<br><small>Radio: ${balance.radio.remaining}j</small>` : ''}
            </td>
            <td>
                <button onclick="editEmployeeBalance(${index})" style="background: #17a2b8; padding: 0.5rem 1rem; font-size: 0.8rem; margin-right: 0.5rem;">💰 Solde</button>
                <button onclick="deleteEmployee(${index})" style="background: #dc3545; padding: 0.5rem 1rem; font-size: 0.8rem;">🗑️ Supprimer</button>
            </td>
        `;
        employeesList.appendChild(row);
    });
}

function deleteEmployee(index) {
    const employee = employees[index];
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${employee.firstname} ${employee.lastname} ? Cette action est irréversible.`)) {
        // Supprimer l'employé
        employees.splice(index, 1);
        
        // Supprimer son mot de passe
        delete securityConfig.employeePasswords[employee.email];
        
        // Supprimer ses soldes
        delete leaveBalances[index];
        
        // Réindexer leaveBalances
        const newLeaveBalances = {};
        employees.forEach((emp, newIndex) => {
            if (leaveBalances[newIndex] !== undefined) {
                newLeaveBalances[newIndex] = leaveBalances[newIndex];
            }
        });
        leaveBalances = newLeaveBalances;
        
        // Mettre à jour le localStorage
        localStorage.setItem('employees', JSON.stringify(employees));
        localStorage.setItem('leaveBalances', JSON.stringify(leaveBalances));
        localStorage.setItem('securityConfig', JSON.stringify(securityConfig));
        
        // Si l'employé supprimé est connecté, le déconnecter
        if (currentUser && currentUser.email === employee.email) {
            logout();
        }
        
        // Mettre à jour l'interface
        loadEmployees();
        populateEmployeeLoginDropdown();
        populateResetEmployeeDropdown();
        updateDashboard();
        
        alert('✅ Employé supprimé avec succès !');
    }
}

// ==================== GESTION DES CONGÉS ====================

function loadLeaveRequests() {
    const leavesList = document.getElementById('leaves-list');
    const myLeavesList = document.getElementById('my-leaves-list');
    
    leavesList.innerHTML = '';
    myLeavesList.innerHTML = '';
    
    if (leaveRequests.length === 0) {
        leavesList.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Aucune demande de congé</td></tr>';
        myLeavesList.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Aucune demande de congé</td></tr>';
        return;
    }
    
    // Pour l'interface RH - toutes les demandes
    leaveRequests.forEach((leave, index) => {
        const employee = employees[leave.employeeIndex];
        if (!employee) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employee.firstname} ${employee.lastname}</td>
            <td><span class="grade-badge">${grades[employee.grade] || employee.grade}</span></td>
            <td><span class="leave-type-badge type-${leave.type}">${leaveTypes[leave.type]}</span></td>
            <td>${leave.startDate} au ${leave.endDate}</td>
            <td>${leave.days} jours</td>
            <td>
                <strong>Adresse:</strong> ${leave.address || employee.address}<br>
                <strong>Tél:</strong> ${leave.phone || employee.phone}
            </td>
            <td><span class="status-${leave.status}">${getStatusText(leave.status)}</span></td>
            <td>
                ${leave.status === 'pending' ? `
                    <button class="btn-approve" onclick="approveLeave(${index})">✅ Approuver</button>
                    <button class="btn-reject" onclick="rejectLeave(${index})">❌ Rejeter</button>
                ` : `
                    <span>Traité</span>
                `}
            </td>
        `;
        leavesList.appendChild(row);
    });
    
    // Pour l'interface employé - seulement ses demandes
    if (currentUser && userType === 'employee') {
        const employeeIndex = employees.findIndex(emp => emp.email === currentUser.email);
        const myLeaves = leaveRequests.filter(leave => leave.employeeIndex === employeeIndex);
        
        if (myLeaves.length === 0) {
            myLeavesList.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Aucune demande de congé</td></tr>';
        } else {
            myLeaves.forEach((leave, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="leave-type-badge type-${leave.type}">${leaveTypes[leave.type]}</span></td>
                    <td>${leave.startDate} au ${leave.endDate}</td>
                    <td>${leave.days} jours</td>
                    <td>
                        <strong>Adresse:</strong> ${leave.address}<br>
                        <strong>Tél:</strong> ${leave.phone}
                    </td>
                    <td>${leave.exceptionnelMotif || '-'}</td>
                    <td><span class="status-${leave.status}">${getStatusText(leave.status)}</span></td>
                    <td>${leave.requestDate}</td>
                `;
                myLeavesList.appendChild(row);
            });
        }
    }
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'En attente',
        'approved': 'Approuvé',
        'rejected': 'Rejeté'
    };
    return statusTexts[status] || status;
}

function approveLeave(index) {
    if (confirm('Êtes-vous sûr de vouloir approuver cette demande de congé ?')) {
        leaveRequests[index].status = 'approved';
        leaveRequests[index].approvalDate = new Date().toLocaleDateString();
        localStorage.setItem('leaveRequests', JSON.stringify(leaveRequests));
        loadLeaveRequests();
        updateDashboard();
        alert('✅ Demande approuvée avec succès !');
    }
}

function rejectLeave(index) {
    if (confirm('Êtes-vous sûr de vouloir rejeter cette demande de congé ?')) {
        leaveRequests[index].status = 'rejected';
        leaveRequests[index].approvalDate = new Date().toLocaleDateString();
        localStorage.setItem('leaveRequests', JSON.stringify(leaveRequests));
        loadLeaveRequests();
        updateDashboard();
        alert('❌ Demande rejetée !');
    }
}

// ==================== MODIFICATION DU SOLDE ====================

function editEmployeeBalance(index) {
    currentEditingEmployeeIndex = index;
    const employee = employees[index];
    const balance = calculateEmployeeLeaveBalance(index);
    const isRadio = isRadioPersonnel(employee);
    
    let modalContent = `
        <h4>Modifier le solde de ${employee.firstname} ${employee.lastname}</h4>
        <form id="balance-form">
            <div class="form-group">
                <label for="edit-annual-acquired">Congés annuels cumulés</label>
                <input type="number" id="edit-annual-acquired" value="${balance.annual.acquired}" min="0" required>
            </div>
            <div class="form-group">
                <label for="edit-annual-taken">Congés annuels pris</label>
                <input type="number" id="edit-annual-taken" value="${balance.annual.taken}" min="0" required>
            </div>
    `;
    
    if (isRadio) {
        modalContent += `
            <div class="form-group">
                <label for="edit-radio-acquired">Congés radio cumulés</label>
                <input type="number" id="edit-radio-acquired" value="${balance.radio.acquired}" min="0" max="30" required>
            </div>
            <div class="form-group">
                <label for="edit-radio-taken">Congés radio pris</label>
                <input type="number" id="edit-radio-taken" value="${balance.radio.taken}" min="0" max="30" required>
            </div>
        `;
    }
    
    modalContent += `
            <div class="form-group">
                <label for="edit-sick-taken">Jours de congé maladie pris cette année</label>
                <input type="number" id="edit-sick-taken" value="${balance.sick.taken}" min="0" required>
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="submit">✅ Enregistrer</button>
                <button type="button" onclick="hideBalanceModal()" style="background: #6c757d;">❌ Annuler</button>
            </div>
        </form>
    `;
    
    document.getElementById('balance-modal-content').innerHTML = modalContent;
    document.getElementById('balance-modal').style.display = 'block';
    
    // Ajouter l'événement submit
    document.getElementById('balance-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveEmployeeBalance();
    });
}

function saveEmployeeBalance() {
    if (currentEditingEmployeeIndex === null) return;
    
    const annualAcquired = parseInt(document.getElementById('edit-annual-acquired').value);
    const annualTaken = parseInt(document.getElementById('edit-annual-taken').value);
    const sickTaken = parseInt(document.getElementById('edit-sick-taken').value);
    
    // Mettre à jour le solde
    leaveBalances[currentEditingEmployeeIndex].annual.acquired = annualAcquired;
    leaveBalances[currentEditingEmployeeIndex].annual.taken = annualTaken;
    leaveBalances[currentEditingEmployeeIndex].annual.remaining = annualAcquired - annualTaken;
    leaveBalances[currentEditingEmployeeIndex].sick.taken = sickTaken;
    
    const employee = employees[currentEditingEmployeeIndex];
    if (isRadioPersonnel(employee)) {
        const radioAcquired = parseInt(document.getElementById('edit-radio-acquired').value);
        const radioTaken = parseInt(document.getElementById('edit-radio-taken').value);
        leaveBalances[currentEditingEmployeeIndex].radio.acquired = radioAcquired;
        leaveBalances[currentEditingEmployeeIndex].radio.taken = radioTaken;
        leaveBalances[currentEditingEmployeeIndex].radio.remaining = radioAcquired - radioTaken;
    }
    
    // Sauvegarder
    localStorage.setItem('leaveBalances', JSON.stringify(leaveBalances));
    
    // Mettre à jour l'interface
    loadEmployees();
    updateDashboard();
    
    hideBalanceModal();
    alert('✅ Solde mis à jour avec succès !');
}

function hideBalanceModal() {
    document.getElementById('balance-modal').style.display = 'none';
    currentEditingEmployeeIndex = null;
}

// ==================== FONCTIONS UTILITAIRES ====================

function isRadioPersonnel(employee) {
    return radioGrades.includes(employee.grade);
}

function initializeEmployeeBalance(employeeIndex, initialBalance = 30) {
    if (!leaveBalances[employeeIndex]) {
        const employee = employees[employeeIndex];
        const isRadio = isRadioPersonnel(employee);
        
        // Récupérer l'année d'embauche pour calculer les congés cumulés
        const hireYear = new Date(employee.hireDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const yearsWorked = currentYear - hireYear;
        
        // Congés annuels cumulés (30 jours par an)
        const cumulativeAnnual = initialBalance + (yearsWorked * 30);
        
        leaveBalances[employeeIndex] = {
            annual: { 
                acquired: cumulativeAnnual, 
                taken: 0, 
                remaining: cumulativeAnnual 
            },
            sick: { 
                acquired: 0,
                taken: 0, 
                remaining: 0 
            },
            other: { 
                acquired: 10, 
                taken: 0, 
                remaining: 10 
            },
            radio: { 
                acquired: isRadio ? 30 : 0, 
                taken: 0, 
                remaining: isRadio ? 30 : 0 
            }
        };
        localStorage.setItem('leaveBalances', JSON.stringify(leaveBalances));
    }
}

function calculateEmployeeLeaveBalance(employeeIndex) {
    initializeEmployeeBalance(employeeIndex);
    
    const balance = JSON.parse(JSON.stringify(leaveBalances[employeeIndex]));
    const employee = employees[employeeIndex];
    const isRadio = isRadioPersonnel(employee);
    
    const currentYear = new Date().getFullYear();
    
    // Calculer les congés pris cette année
    ['annuel', 'maladie', 'radio'].forEach(type => {
        const leavesThisYear = leaveRequests.filter(request => 
            request.employeeIndex === employeeIndex && 
            request.type === type && 
            request.status === 'approved' &&
            new Date(request.startDate).getFullYear() === currentYear
        );
        
        let daysTaken = 0;
        leavesThisYear.forEach(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            daysTaken += Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        });
        
        if (type === 'annuel') {
            balance.annual.taken = daysTaken;
            balance.annual.remaining = Math.max(0, balance.annual.acquired - daysTaken);
        } else if (type === 'maladie') {
            balance.sick.taken = daysTaken;
            balance.sick.remaining = 0;
        } else if (type === 'radio' && isRadio) {
            balance.radio.taken = Math.min(daysTaken, 30);
            balance.radio.remaining = Math.max(0, balance.radio.acquired - balance.radio.taken);
        }
    });
    
    return balance;
}

function populateEmployeeLoginDropdown() {
    const dropdown = document.getElementById('employee-select');
    dropdown.innerHTML = '<option value="">Choisissez votre nom</option>';
    
    employees.forEach((employee, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${employee.firstname} ${employee.lastname} - ${grades[employee.grade] || employee.grade}`;
        dropdown.appendChild(option);
    });
}

function populateGradeDropdowns() {
    const filterGradeDropdown = document.getElementById('filter-grade');
    if (filterGradeDropdown) {
        filterGradeDropdown.innerHTML = '<option value="all">Tous les grades</option>';
        Object.keys(grades).forEach(gradeKey => {
            const option = document.createElement('option');
            option.value = gradeKey;
            option.textContent = grades[gradeKey];
            filterGradeDropdown.appendChild(option);
        });
    }
    
    const filterSoldeGradeDropdown = document.getElementById('filter-solde-grade');
    if (filterSoldeGradeDropdown) {
        filterSoldeGradeDropdown.innerHTML = '<option value="all">Tous les grades</option>';
        Object.keys(grades).forEach(gradeKey => {
            const option = document.createElement('option');
            option.value = gradeKey;
            option.textContent = grades[gradeKey];
            filterSoldeGradeDropdown.appendChild(option);
        });
    }
}

function populateResetEmployeeDropdown() {
    const dropdown = document.getElementById('reset-employee-select');
    dropdown.innerHTML = '<option value="">Choisir un employé</option>';
    employees.forEach((employee, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${employee.firstname} ${employee.lastname} - ${grades[employee.grade] || employee.grade}`;
        dropdown.appendChild(option);
    });
}

// ==================== FORMULAIRE OFFICIEL TUNISIEN ====================

function updateOfficialFormDropdown() {
    if (!currentUser) return;
    
    const dropdown = document.getElementById('official-leave-select');
    dropdown.innerHTML = '<option value="">Choisir une demande approuvée</option>';
    
    const employeeIndex = employees.findIndex(emp => emp.email === currentUser.email);
    const approvedLeaves = leaveRequests.filter(leave => 
        leave.employeeIndex === employeeIndex && leave.status === 'approved'
    );
    
    approvedLeaves.forEach((leave, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${leaveTypes[leave.type]} - ${leave.startDate} au ${leave.endDate} (${leave.days} jours)`;
        dropdown.appendChild(option);
    });
}

function updateTunisianFormDropdown() {
    const dropdown = document.getElementById('tunisian-leave-select');
    dropdown.innerHTML = '<option value="">Choisir une demande approuvée</option>';
    
    employees.forEach((employee, empIndex) => {
        const approvedLeaves = leaveRequests.filter(leave => 
            leave.employeeIndex === empIndex && leave.status === 'approved'
        );
        
        approvedLeaves.forEach((leave, index) => {
            const option = document.createElement('option');
            option.value = `${empIndex}-${index}`;
            option.textContent = `${employee.firstname} ${employee.lastname} - ${leaveTypes[leave.type]} - ${leave.startDate} au ${leave.endDate}`;
            dropdown.appendChild(option);
        });
    });
}

function updateOfficialForm() {
    const select = document.getElementById('official-leave-select');
    const container = document.getElementById('official-form-container');
    
    if (select.value === '') {
        container.style.display = 'none';
        return;
    }
    
    const employeeIndex = employees.findIndex(emp => emp.email === currentUser.email);
    const approvedLeaves = leaveRequests.filter(leave => 
        leave.employeeIndex === employeeIndex && leave.status === 'approved'
    );
    const selectedLeave = approvedLeaves[select.value];
    
    if (selectedLeave) {
        generateTunisianForm(currentUser, selectedLeave, container);
    }
}

function updateTunisianForm() {
    const select = document.getElementById('tunisian-leave-select');
    const container = document.getElementById('tunisian-form-container');
    
    if (select.value === '') {
        container.style.display = 'none';
        return;
    }
    
    const [empIndex, leaveIndex] = select.value.split('-');
    const employee = employees[empIndex];
    const approvedLeaves = leaveRequests.filter(leave => 
        leave.employeeIndex === parseInt(empIndex) && leave.status === 'approved'
    );
    const selectedLeave = approvedLeaves[leaveIndex];
    
    if (selectedLeave) {
        generateTunisianForm(employee, selectedLeave, container);
    }
}

function generateTunisianForm(employee, leave, container) {
    const formHTML = `
        <div class="header">
            <div>الجمهورية التونسية</div>
            <div>وزارة الصحة</div>
            <div>مجمع الصحة الأساسية بتونس الجنوبية</div>
            <h2>مطلــــب إجــــازة</h2>
        </div>
        
        <div class="section">
            <div class="section-title">نوع الإجازة</div>
            <div class="checkbox-group">
                <input type="checkbox" ${leave.type === 'annuel' ? 'checked' : ''} disabled>
                <label class="field-label"></label>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" ${leave.type !== 'annuel' && leave.type !== 'maladie' && leave.type !== 'maternite' && leave.type !== 'recuperation' ? 'checked' : ''} disabled>
                <label class="field-label">إجازة استثنائية، موجبها:</label>
                <div class="field-value">${leaveTypes[leave.type]}${leave.exceptionnelMotif ? ' - ' + leave.exceptionnelMotif : ''}</div>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" ${leave.type === 'maladie' || leave.type === 'maternite' || leave.type === 'longue-duree' ? 'checked' : ''} disabled>
                <label class="field-label">عطلة لأسباب صحيّة (2) مرض ولادة أمومة</label>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" ${leave.type === 'recuperation' ? 'checked' : ''} disabled>
                <label class="field-label">إجازة تعويضية</label>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" ${leave.type === 'certificat' ? 'checked' : ''} disabled>
                <label class="field-label">شهادة مرافقة</label>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">معلومات الموظف</div>
            <div class="field">
                <label class="field-label">الاسم واللقب</label>
                <div class="field-value">${employee.firstname} ${employee.lastname}</div>
            </div>
            <div class="field">
                <label class="field-label">الرتبة او الصنف</label>
                <div class="field-value">${grades[employee.grade] || employee.grade}</div>
            </div>
            <div class="field">
                <label class="field-label">الخطّة الوظيفيّة</label>
                <div class="field-value">${grades[employee.grade] || employee.grade}</div>
            </div>
            <div class="field">
                <label class="field-label">الهيكل الإداري</label>
                <div class="field-value">مجمع الصحة الأساسية بتونس الجنوبية</div>
            </div>
            <div class="field">
                <label class="field-label">مركز العمل</label>
                <div class="field-value">المركز الوسيط علي طراد</div>
            </div>
            <div class="field">
                <label class="field-label">عنوان مقر السكنى طيلة العطلة</label>
                <div class="field-value">${leave.address || employee.address}</div>
            </div>
            <div class="field">
                <label class="field-label">الترقيم البريدي والهاتف</label>
                <div class="field-value">${leave.phone || employee.phone}</div>
            </div>
            <div class="field">
                <label class="field-label">الوثائق المصاحبة</label>
                <div class="field-value">${leave.type === 'maladie' ? 'شهادة طبية' : (leave.type === 'certificat' ? 'شهادة مرافقة' : 'لا يوجد')}</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">تفاصيل الإجازة</div>
            <div class="field">
                <label class="field-label">إجازة لمدة</label>
                <div class="field-value">${leave.days} أيام</div>
            </div>
            <div class="field">
                <label class="field-label">من</label>
                <div class="field-value">${leave.startDate}</div>
            </div>
            <div class="field">
                <label class="field-label">الى</label>
                <div class="field-value">${leave.endDate}</div>
            </div>
        </div>
        
        <!-- Espace pour les signatures décalées -->
        <div class="signature-area">
            <div class="signature-box">
                <div>إمضاء المعني بالامر</div>
            </div>
            <div class="signature-box">
                <div>الناظر العام</div>
            </div>
        </div>
        
        <div class="signature-area">
            <div class="signature-box">
                <div>الرئيس المباشر</div>
            </div>
            <div class="signature-box">
                <div>مدير مجمع الصحّة الأساسيّة بتونس الجنوبيّة</div>
            </div>
        </div>
        
        <div class="note">
            (2) بالنسبة للعطل غير السنوية يرفق المطلب وجوبا بالوثائق المدعّة لها
        </div>
    `;
    
    container.innerHTML = formHTML;
    container.style.display = 'block';
}

function printOfficialForm() {
    const container = document.getElementById('official-form-container');
    if (container.style.display === 'none') {
        alert('❌ Veuillez sélectionner une demande approuvée d\'abord');
        return;
    }
    printTunisianForm(container);
}

function printTunisianForm(container = null) {
    const formContainer = container || document.getElementById('tunisian-form-container');
    if (formContainer.style.display === 'none') {
        alert('❌ Veuillez sélectionner une demande approuvée d\'abord');
        return;
    }
    
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>مطلب إجازة - Formulaire Officiel</title>
            <style>
                body { 
                    font-family: 'Times New Roman', serif; 
                    margin: 0.5rem; 
                    direction: rtl; 
                    font-size: 8px !important; 
                    line-height: 1.1 !important; 
                }
                .tunisian-form { 
                    border: 2px solid #333; 
                    padding: 0.5rem; 
                    font-size: 8px !important; 
                    margin: 0;
                    page-break-inside: avoid;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 0.5rem; 
                    border-bottom: 2px solid #333; 
                    padding-bottom: 0.25rem; 
                }
                .header h2 { 
                    font-size: 1rem !important; 
                    font-weight: bold; 
                    margin-bottom: 0.25rem; 
                }
                .section { 
                    margin-bottom: 0.25rem; 
                    border: 1px solid #ccc; 
                    padding: 0.25rem; 
                }
                .section-title { 
                    font-weight: bold; 
                    margin-bottom: 0.25rem; 
                    border-bottom: 1px solid #333; 
                    padding-bottom: 0.125rem; 
                    font-size: 0.9rem; 
                }
                .field { 
                    margin-bottom: 0.25rem; 
                    display: flex; 
                    align-items: center; 
                }
                .field-label { 
                    font-weight: bold; 
                    margin-bottom: 0.125rem; 
                    min-width: 150px; 
                    margin-left: 0.5rem; 
                    font-size: 8px !important; 
                }
                .field-value { 
                    border-bottom: 1px solid #333; 
                    padding: 0.125rem 0; 
                    min-height: 1rem; 
                    flex: 1; 
                    text-align: right; 
                    font-size: 8px !important; 
                }
                .checkbox-group { 
                    display: flex; 
                    align-items: center; 
                    margin-bottom: 0.25rem; 
                }
                .checkbox-group input { 
                    width: auto; 
                    margin-left: 0.25rem; 
                    transform: scale(0.7);
                }
                .signature-area { 
                    margin-top: 0.75rem; 
                    display: flex; 
                    justify-content: space-between; 
                    flex-wrap: wrap; 
                }
                .signature-box { 
                    width: 45%; 
                    border-top: 1px solid #333; 
                    padding-top: 0.5rem; 
                    text-align: center; 
                    margin-bottom: 0.5rem; 
                    font-size: 8px !important; 
                }
                .note { 
                    font-size: 0.6rem; 
                    font-style: italic; 
                    margin-top: 0.5rem; 
                    text-align: center; 
                    border-top: 1px solid #ccc; 
                    padding-top: 0.25rem; 
                }
                @media print { 
                    body { margin: 0; padding: 0.5rem; }
                    .tunisian-form { margin: 0; }
                }
            </style>
        </head>
        <body>
            ${formContainer.outerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== FONCTIONS SIMPLIFIÉES POUR L'EXEMPLE ====================

function updateDashboard() {
    document.getElementById('total-employees').textContent = employees.length;
    document.getElementById('pending-requests').textContent = leaveRequests.filter(r => r.status === 'pending').length;
    document.getElementById('approved-requests').textContent = leaveRequests.filter(r => r.status === 'approved').length;
    document.getElementById('rejected-requests').textContent = leaveRequests.filter(r => r.status === 'rejected').length;
    
    // Mettre à jour les dropdowns des formulaires
    updateOfficialFormDropdown();
    updateTunisianFormDropdown();
}

function updateEmployeeInterface() {
    if (!currentUser) return;
    
    document.getElementById('connected-employee-name').textContent = `${currentUser.firstname} ${currentUser.lastname}`;
    
    const employeeIndex = employees.findIndex(emp => emp.email === currentUser.email);
    if (employeeIndex === -1) return;
    
    const balance = calculateEmployeeLeaveBalance(employeeIndex);
    
    // Mettre à jour les informations personnelles
    document.getElementById('info-name').textContent = `${currentUser.firstname} ${currentUser.lastname}`;
    document.getElementById('info-email').textContent = currentUser.email;
    document.getElementById('info-grade').textContent = grades[currentUser.grade] || currentUser.grade;
    document.getElementById('info-hire-date').textContent = currentUser.hireDate;
    document.getElementById('info-acquired-leave').textContent = `${balance.annual.acquired} jours`;
    document.getElementById('info-taken-leave').textContent = `${balance.annual.taken} jours`;
    document.getElementById('info-remaining-leave').textContent = `${balance.annual.remaining} jours`;
    document.getElementById('info-sick-taken').textContent = `${balance.sick.taken} jours`;
    
    // Afficher/masquer les informations radio
    const radioInfo = document.getElementById('radio-leave-info');
    if (isRadioPersonnel(currentUser)) {
        radioInfo.style.display = 'block';
        document.getElementById('info-radio-acquired').textContent = `${balance.radio.acquired} jours`;
        document.getElementById('info-radio-taken').textContent = `${balance.radio.taken} jours`;
        document.getElementById('info-radio-remaining').textContent = `${balance.radio.remaining} jours`;
    } else {
        radioInfo.style.display = 'none';
    }
    
    // Mettre à jour le dropdown de la feuille officielle
    updateOfficialFormDropdown();
    
    updateEmployeeBalance();
}

function updateEmployeeBalance() {
    if (!currentUser) return;
    
    const employeeIndex = employees.findIndex(emp => emp.email === currentUser.email);
    const balance = calculateEmployeeLeaveBalance(employeeIndex);
    
    let balanceGridHTML = `
        <div class="balance-item">
            <div>Congés Annuels</div>
            <div class="balance-number ${balance.annual.remaining < 5 ? 'balance-negative' : 'balance-positive'}">
                ${balance.annual.remaining}
            </div>
            <div style="font-size: 0.8rem;">cumulés: ${balance.annual.acquired} jours</div>
        </div>
        <div class="balance-item">
            <div>Congés Maladie</div>
            <div class="balance-number balance-positive">
                ${balance.sick.taken}
            </div>
            <div style="font-size: 0.8rem;">jours pris cette année</div>
        </div>
    `;
    
    // Ajouter les congés radio si applicable
    if (isRadioPersonnel(currentUser)) {
        balanceGridHTML += `
            <div class="balance-item">
                <div>Congés Radio</div>
                <div class="balance-number ${balance.radio.remaining < 5 ? 'balance-negative' : 'balance-positive'}">
                    ${balance.radio.remaining}
                </div>
                <div style="font-size: 0.8rem;">sur ${balance.radio.acquired} jours</div>
            </div>
        `;
    }
    
    document.getElementById('employee-balance-grid').innerHTML = balanceGridHTML;
}

// Navigation
function switchTab(tabName) {
    document.querySelectorAll('#rh-interface .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('#rh-interface .nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

function switchEmployeeTab(tabName) {
    document.querySelectorAll('#employee-interface .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('#employee-interface .nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// ==================== CALCUL DES JOURS DE CONGÉ ====================

function calculateDays() {
    const startDate = document.getElementById('employee-start-date').value;
    const endDate = document.getElementById('employee-end-date').value;
    const daysInput = document.getElementById('employee-days');
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Calculer la différence en jours
        const timeDiff = end.getTime() - start.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 pour inclure le jour de début
        
        if (daysDiff > 0) {
            daysInput.value = daysDiff;
        } else {
            daysInput.value = '';
            alert('❌ La date de fin doit être après la date de début');
        }
    } else {
        daysInput.value = '';
    }
}

// Fonctions à implémenter
function changeRHPassword() {
    const newPassword = document.getElementById('new-rh-password').value;
    const confirmPassword = document.getElementById('confirm-rh-password').value;
    
    if (!newPassword) {
        alert('❌ Veuillez entrer un nouveau mot de passe');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('❌ Les mots de passe ne correspondent pas');
        return;
    }
    
    securityConfig.rhPassword = newPassword;
    localStorage.setItem('securityConfig', JSON.stringify(securityConfig));
    
    document.getElementById('new-rh-password').value = '';
    document.getElementById('confirm-rh-password').value = '';
    
    alert('✅ Mot de passe RH changé avec succès !');
}

function changeEmployeePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentUser) return;
    
    const storedPassword = securityConfig.employeePasswords[currentUser.email];
    
    if (currentPassword !== storedPassword) {
        alert('❌ Mot de passe actuel incorrect');
        return;
    }
    
    if (!newPassword) {
        alert('❌ Veuillez entrer un nouveau mot de passe');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('❌ Les mots de passe ne correspondent pas');
        return;
    }
    
    securityConfig.employeePasswords[currentUser.email] = newPassword;
    localStorage.setItem('securityConfig', JSON.stringify(securityConfig));
    
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    alert('✅ Mot de passe changé avec succès !');
}

function resetEmployeePassword() {
    const employeeIndex = document.getElementById('reset-employee-select').value;
    
    if (!employeeIndex) {
        alert('❌ Veuillez sélectionner un employé');
        return;
    }
    
    const employee = employees[employeeIndex];
    
    if (confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${employee.firstname} ${employee.lastname} ? Le nouveau mot de passe sera "1234".`)) {
        securityConfig.employeePasswords[employee.email] = '1234';
        localStorage.setItem('securityConfig', JSON.stringify(securityConfig));
        
        alert('✅ Mot de passe réinitialisé avec succès ! Nouveau mot de passe : 1234');
    }
}

function updateLeaveBalances() {
    // Fonction simplifiée
}

function filterLeaves() {
    // Fonction simplifiée
}

function generatePrintableReport() {
    alert('Fonction à implémenter: Génération rapport');
}

function updateLeaveTypeOptions() {
    const leaveType = document.getElementById('employee-leave-type').value;
    const motifGroup = document.getElementById('exceptionnel-motif-group');
    
    // Afficher/masquer le champ motif pour congé exceptionnel
    if (leaveType === 'exceptionnel') {
        motifGroup.style.display = 'block';
    } else {
        motifGroup.style.display = 'none';
    }
    
    // Afficher/masquer l'option radio pour le personnel concerné
    const radioOption = document.getElementById('radio-option');
    if (currentUser && radioGrades.includes(currentUser.grade)) {
        radioOption.style.display = 'block';
    } else {
        radioOption.style.display = 'none';
    }
}

// Soumission de demande de congé
function handleLeaveRequest(e) {
    e.preventDefault();
    
    const employeeIndex = employees.findIndex(emp => emp.email === currentUser.email);
    const leaveType = document.getElementById('employee-leave-type').value;
    const startDate = document.getElementById('employee-start-date').value;
    const endDate = document.getElementById('employee-end-date').value;
    const days = document.getElementById('employee-days').value;
    const address = document.getElementById('employee-address').value;
    const phone = document.getElementById('employee-phone').value;
    const exceptionnelMotif = document.getElementById('exceptionnel-motif').value;
    
    const newLeaveRequest = {
        employeeIndex: employeeIndex,
        type: leaveType,
        startDate: startDate,
        endDate: endDate,
        days: parseInt(days),
        address: address,
        phone: phone,
        exceptionnelMotif: leaveType === 'exceptionnel' ? exceptionnelMotif : null,
        status: 'pending',
        requestDate: new Date().toLocaleDateString()
    };
    
    leaveRequests.push(newLeaveRequest);
    localStorage.setItem('leaveRequests', JSON.stringify(leaveRequests));
    
    alert('✅ Demande de congé soumise avec succès !');
    document.getElementById('employee-leave-request-form').reset();
    document.getElementById('employee-days').value = '';
    document.getElementById('exceptionnel-motif-group').style.display = 'none';
    
    // Mettre à jour le tableau de bord et les listes
    loadLeaveRequests();
    updateDashboard();
}