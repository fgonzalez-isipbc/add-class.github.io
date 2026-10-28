
const API_URL = "https://script.google.com/macros/s/AKfycbxyl21MeLotpz4TCa4VLzp5LIrN-_91pjFxVcaiSRPlwpFxl6H9HGYAfjOGYA3tDM3Gdg/exec";

let currentUser = null;
let globalData = null;
let selectedVoteValue = null;
let currentEvaluatingTeam = null;

// Utilidad para transformar enlace de Drive a preview
function getDriveEmbedUrl(url) {
    if (!url) return "";
    if (url.includes("drive.google.com")) {
        let fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
        }
    }
    return url;
}

async function callAPI(action, payload = {}) {
    payload.action = action;
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (err) {
        alert("Error de conexión con el servidor.");
        return { success: false, message: err.toString() };
    }
}

async function login() {
    const correo = document.getElementById("loginEmail").value.trim();
    const contrasena = document.getElementById("loginPass").value;
    if (!correo || !contrasena) return alert("Por favor llena todos los campos.");

    const btn = document.getElementById("btnLogin");
    btn.innerHTML = '<div class="spinner"></div>';

    const res = await callAPI("login", { correo, contrasena });
    btn.innerHTML = "Ingresar";

    if (res.success) {
        if (res.needsPassword) {
            currentUser = { correo };
            switchView("viewSetPassword");
        } else {
            currentUser = res.alumno;
            initDashboard();
        }
    } else {
        alert(res.message);
    }
}

async function saveNewPassword() {
    const contrasena = document.getElementById("newPass").value;
    if (!contrasena) return alert("Ingresa una contraseña válida.");

    const res = await callAPI("setPassword", { correo: currentUser.correo, contrasena });
    if (res.success) {
        alert("Contraseña creada con éxito. Por favor inicia sesión.");
        location.reload();
    } else {
        alert(res.message);
    }
}

function logout() {
    currentUser = null;
    location.reload();
}

function switchView(viewId) {
    document.getElementById("viewLogin").classList.add("hidden");
    document.getElementById("viewSetPassword").classList.add("hidden");
    document.getElementById("viewDashboard").classList.add("hidden");
    document.getElementById(viewId).classList.remove("hidden");
}

async function initDashboard() {
    switchView("viewDashboard");
    document.getElementById("userHeader").classList.remove("hidden");
    document.getElementById("headerUserName").innerText = currentUser.nombre;
    document.getElementById("headerUserTeam").innerText = "Equipo " + currentUser.equipo;

    await loadDashboardData();
}

async function loadDashboardData() {
    const res = await callAPI("getData", { correo: currentUser.correo });
    if (!res.success) return;

    globalData = res;
    if (res.alumno) currentUser = res.alumno;

    // Revisar si su equipo ya subió video
    const myTeamData = res.equipos[currentUser.equipo];
    const uploadSec = document.getElementById("sectionUploadVideo");
    const questionsSec = document.getElementById("sectionUploadQuestions");

    if (myTeamData && myTeamData.video) {
        uploadSec.classList.add("hidden");
        // Si ya subió video, mostrar preguntas si no las ha configurado o permitir verlas
        questionsSec.classList.remove("hidden");
        if (res.preguntas[currentUser.equipo]) {
            renderExistingQuestions(res.preguntas[currentUser.equipo]);
        } else {
            initQuestionsBuilder();
        }
    } else {
        uploadSec.classList.remove("hidden");
        questionsSec.classList.add("hidden");
    }

    renderTeamsGrid(res.equipos, res.preguntas);
}

async function uploadVideo() {
    const link = document.getElementById("inputVideoLink").value.trim();
    if (!link || !link.startsWith("http")) return alert("Ingresa un enlace de video válido.");

    const res = await callAPI("uploadVideo", { correo: currentUser.correo, equipo: currentUser.equipo, link });
    if (res.success) {
        alert(res.message);
        loadDashboardData();
    } else {
        alert(res.message);
    }
}

// Constructor dinámico de preguntas (Max 5)
let questionCount = 0;
function initQuestionsBuilder() {
    document.getElementById("questionsFormList").innerHTML = "";
    questionCount = 0;
    addQuestionField();
}

function addQuestionField() {
    if (questionCount >= 5) return alert("Máximo 5 preguntas permitidas.");
    questionCount++;

    const container = document.getElementById("questionsFormList");
    const div = document.createElement("div");
    div.className = "card";
    div.style.padding = "16px";
    div.style.marginBottom = "12px";
    div.innerHTML = `
        <div class="form-group" style="margin-bottom:12px;">
            <label>Pregunta ${questionCount}</label>
            <input type="text" class="q-text" placeholder="Escribe tu pregunta aquí...">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
            <label>Tipo de Pregunta</label>
            <select class="q-type" onchange="toggleChooseOptions(this)">
                <option value="TEXT">TEXT (Abierta)</option>
                <option value="CHOOSE">CHOOSE (Opciones Múltiples)</option>
                <option value="NUMBER">NUMBER (Numérica)</option>
                <option value="RATE">RATE (Del 1 al 5)</option>
            </select>
        </div>
        <div class="form-group choose-options-group hidden" style="margin-bottom:0;">
            <label>Opciones (Separadas por coma)</label>
            <input type="text" class="q-options" placeholder="Opción 1, Opción 2, Opción 3">
        </div>
    `;
    container.appendChild(div);
}

function toggleChooseOptions(selectElem) {
    const group = selectElem.closest(".card").querySelector(".choose-options-group");
    if (selectElem.value === "CHOOSE") {
        group.classList.remove("hidden");
    } else {
        group.classList.add("hidden");
    }
}

function renderExistingQuestions(questions) {
    const container = document.getElementById("questionsFormList");
    container.innerHTML = `<p class="subtitle" style="color:var(--text-primary); font-weight:500;">Ya has configurado ${questions.length} preguntas para tu equipo:</p>`;
    questions.forEach((q, idx) => {
        container.innerHTML += `
            <div style="background:#f5f5f7; padding:12px; border-radius:8px; margin-bottom:8px; font-size:0.9rem;">
                <strong>${idx + 1}. [${q.tipo}]</strong> ${q.pregunta} ${q.tipo === 'CHOOSE' ? '<br><small>Opciones: ' + q.respuestas + '</small>' : ''}
            </div>
        `;
    });
}

async function submitQuestions() {
    const cards = document.querySelectorAll("#questionsFormList .card");
    let preguntasArray = [];
    
    for (let card of cards) {
        const text = card.querySelector(".q-text").value.trim();
        const type = card.querySelector(".q-type").value;
        const optInput = card.querySelector(".q-options");
        
        if (!text) return alert("Todas las preguntas deben tener texto.");
        
        let respuestas = [];
        if (type === "CHOOSE") {
            if (!optInput.value.trim()) return alert("Las preguntas tipo CHOOSE requieren opciones separadas por comas.");
            respuestas = optInput.value.split(",").map(s => s.trim());
        }
        
        preguntasArray.push({ pregunta: text, tipo: type, respuestas: respuestas });
    }

    const res = await callAPI("uploadQuestions", { correo: currentUser.correo, equipo: currentUser.equipo, preguntas: preguntasArray });
    if (res.success) {
        alert(res.message);
        loadDashboardData();
    } else {
        alert(res.message);
    }
}

function renderTeamsGrid(equipos, preguntasMap) {
    const grid = document.getElementById("teamsGrid");
    grid.innerHTML = "";

    for (let eq in equipos) {
        const teamData = equipos[eq];
        const isMyTeam = (eq.toString() === currentUser.equipo.toString());
        const hasVideo = !!teamData.video;
        
        let statusBadge = hasVideo ? 
            `<span class="status-pill status-delivered">Video Entregado</span>` : 
            `<span class="status-pill status-pending">Pendiente Video</span>`;

        let card = document.createElement("div");
        card.className = "project-card";
        card.innerHTML = `
            <div>
                <h3>Equipo ${eq}</h3>
                <p style="font-size:0.85rem; color: var(--text-secondary); margin-bottom: 12px;">Miembros: ${teamData.miembros.join(', ')}</p>
                ${statusBadge}
            </div>
            <div style="margin-top: 20px;">
                ${hasVideo ? `<button class="btn" style="width:100%; font-size:0.9rem; padding:10px;" onclick="openEvaluationModal('${eq}')">Ver Video y Evaluar</button>` : `<p style="font-size:0.85rem; color:var(--text-secondary); text-align:center;">Video no disponible aún</p>`}
            </div>
        `;
        grid.appendChild(card);
    }
}

function openEvaluationModal(equipoKey) {
    currentEvaluatingTeam = equipoKey;
    const teamData = globalData.equipos[equipoKey];
    
    document.getElementById("modalTeamTitle").innerText = `Evaluación - Equipo ${equipoKey}`;
    document.getElementById("modalVideoFrame").src = getDriveEmbedUrl(teamData.video);
    
    // Reset modal state
    selectedVoteValue = null;
    document.querySelectorAll(".vote-btn").forEach(b => b.classList.remove("selected"));
    document.getElementById("btnContinueEval").classList.add("hidden");
    document.getElementById("formQuestionsSection").classList.add("hidden");
    document.getElementById("votingSection").classList.remove("hidden");

    document.getElementById("modalEvaluation").classList.add("active");
}

function closeModal() {
    document.getElementById("modalEvaluation").classList.remove("active");
    document.getElementById("modalVideoFrame").src = "";
}

function selectVote(voteType, btnElem) {
    document.querySelectorAll(".vote-btn").forEach(b => b.classList.remove("selected"));
    btnElem.classList.add("selected");
    selectedVoteValue = voteType;
    document.getElementById("btnContinueEval").classList.remove("hidden");
}

function showFormSection() {
    document.getElementById("votingSection").classList.add("hidden");
    const formSec = document.getElementById("formQuestionsSection");
    formSec.classList.remove("hidden");

    const container = document.getElementById("dynamicQuestionsContainer");
    container.innerHTML = "";

    const questions = globalData.preguntas[currentEvaluatingTeam];
    if (!questions || questions.length === 0) {
        container.innerHTML = `<p class="subtitle">Este equipo no configuró preguntas adicionales.</p>`;
        return;
    }

    questions.forEach((q, idx) => {
        let inputHtml = "";
        if (q.tipo === "TEXT") {
            inputHtml = `<textarea class="eval-answer" data-index="${idx}" rows="2" placeholder="Escribe tu respuesta..."></textarea>`;
        } else if (q.tipo === "CHOOSE") {
            let opts = q.respuestas.split("|").map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join("");
            inputHtml = `<select class="eval-answer" data-index="${idx}"><option value="">Selecciona una opción...</option>${opts}</select>`;
        } else if (q.tipo === "NUMBER") {
            inputHtml = `<input type="number" class="eval-answer" data-index="${idx}" placeholder="Ingresa un número...">`;
        } else if (q.tipo === "RATE") {
            inputHtml = `<select class="eval-answer" data-index="${idx}"><option value="">Califica del 1 al 5...</option><option value="1">1 - Deficiente</option><option value="2">2 - Regular</option><option value="3">3 - Bueno</option><option value="4">4 - Muy Bueno</option><option value="5">5 - Excelente</option></select>`;
        }

        container.innerHTML += `
            <div class="form-group" style="margin-bottom:16px;">
                <label>${idx + 1}. ${q.pregunta}</label>
                ${inputHtml}
            </div>
        `;
    });
}

async function submitEvaluationFinal() {
    if (!selectedVoteValue) return alert("Selecciona una calificación de votación.");

    const answerInputs = document.querySelectorAll(".eval-answer");
    let respuestas = [];
    
    for (let input of answerInputs) {
        if (!input.value.trim()) return alert("Por favor responde todas las preguntas del cuestionario.");
        respuestas.push(input.value.trim());
    }

    const res = await callAPI("submitEvaluation", {
        correo: currentUser.correo,
        equipoVotado: currentEvaluatingTeam,
        votacion: selectedVoteValue,
        respuestas: respuestas
    });

    if (res.success) {
        alert("¡Evaluación enviada con éxito!");
        closeModal();
        loadDashboardData();
    } else {
        alert(res.message);
    }
}
