let selectedTasks = [];
let users = {};
const userMapping = {};

frappe.ready(function () {
    if (frappe.session.user === "Guest" || frappe.session.user === "guest" || !frappe.session.user) {
        frappe.msgprint({
            title: __('Alert - Not logged in'),
            indicator: 'red',
            message: __(`
                Kindly Login and then refresh this page, or open this page in Chrome browser.
                <br><br>
                <a href="/login" target="_blank"><button class="btn btn-primary">Login</button></a>`)
        });
        return;
    }

    getUsers().then(() => {
        fetchAllTasks();
        fetchUsers();
        fetchAllProjects();
        fetchAllIdeas();
    });
});

function sortTableByPriority() {
    const table = document.getElementById('taskTableBody');
    const rows = Array.from(table.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const priorityA = a.querySelector('td:nth-child(5)').innerText.toLowerCase();
        const priorityB = b.querySelector('td:nth-child(5)').innerText.toLowerCase();

        // Customize sorting logic if needed (e.g., "High", "Medium", "Low")
        const priorityOrder = { 'urgent': 1, 'high': 2, 'medium': 3, 'low': 4 };
        return (priorityOrder[priorityA] || 4) - (priorityOrder[priorityB] || 4);
    });

    // Re-attach rows in sorted order
    rows.forEach(row => table.appendChild(row));
}

async function fetchAllIdeas() {
    let response = await frappe.call({ method: "stpm", args: { "request": "fetch_all_ideas" } });

    let ideas = response.message;

    let ideaTableBody = document.getElementById("ideaTableBody");
    ideaTableBody.innerHTML = '';

    ideas.forEach(idea => {
        let row = document.createElement("tr");
        let createdBy = userMapping[idea.owner] ? userMapping[idea.owner] : idea.owner;
        row.innerHTML = `
            <td>${idea.name}</td>
            <td>${idea.idea_description ? idea.idea_description : "-"}</td>
            <td>${createdBy}</td>
            <td>${idea?.priority ?? "NA"}</td>
            <td><button class="btn btn-warning btn-sm" onclick="removeIdea('${idea.name}')">Remove</button></td>
        `;
        ideaTableBody.appendChild(row);
    });
}

async function fetchAllTasks() {
    let response = await frappe.call({ method: "stpm", args: { "request": "fetch_all_tasks" } });

    let tasks = response.message;

    let taskTableBody = document.getElementById("taskTableBody");
    taskTableBody.innerHTML = ''; // Clear any existing rows

    tasks.forEach((task, index) => {
        let row = document.createElement("tr");
        row.innerHTML = `
            <td align="center">${Number(index) + 1}</td>
            <td align="center"><input type="checkbox" class="task-checkbox" data-task-id="${task.name}"></td>
            <td><span class="task-name" style="color: blue; text-decoration: underline; cursor: pointer;" data-task-id="${task.name}">${task.name}</span></td>
            <td data-bs-toggle="tooltip" title="${task.task_description}">${task.task_subject}</td>
            <td>${task.priority ? task.priority : "Low"}</td>
            <td>${task.module ? task.module : "NA"}</td>
            <td>${task.status}</td>
        `;
        taskTableBody.appendChild(row);
    });

    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Add click event listeners to task names
    document.querySelectorAll('.task-name').forEach(taskNameElement => {
        taskNameElement.addEventListener('click', async function () {
            const taskId = this.dataset.taskId;
            // const task = tasks.find(t => t.name === taskId);
            let task = await frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Software Team - Task and Project Management",
                    name: taskId
                }
            });
            task = task.message;

            // Function to fetch project data from the backend
            async function fetchIdeaData() {
                try {
                    let response = await frappe.call({ method: "stpm", args: { "request": "fetch_ideas_list" } });
                    let ideas = response.message;
                    return ideas;
                } catch (error) {
                    console.error('Error fetching idea data:', error);
                }

            }

            // Initialize the dropdown with data from the backend
            fetchIdeaData().then(idea => {
                const ideaDropdown = document.getElementById('ideaDropdownTaskDetails');
                const ideaSearch = document.getElementById('ideaSearchTaskDetails');

                function updateDropdown(filter = '') {
                    ideaDropdown.innerHTML = '';
                    idea.filter(project =>
                        project.name.toLowerCase().includes(filter.toLowerCase())
                    ).forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.name;
                        if (project.name === task.idea) option.selected = 1;
                        option.textContent = `${project.name}`;
                        ideaDropdown.appendChild(option);
                    });
                }

                ideaSearch.addEventListener('input', (e) => {
                    updateDropdown(e.target.value);
                });

                ideaSearch.addEventListener('change', (e) => {
                    ideaSearch.value = e.target.value;
                });

                // Initial population of the dropdown
                updateDropdown();
            });

            // Populate modal fields with task data
            document.getElementById("taskSubjectModal").value = task.task_subject;
            document.getElementById("taskDescriptionModal").value = task.task_description;

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
            modal.show();

            // Save the updated task on Save button click
            document.getElementById("saveTaskButton").onclick = async () => {
                const updatedSubject = document.getElementById("taskSubjectModal").value;
                const updatedDescription = document.getElementById("taskDescriptionModal").value;
                const ideaDropdownTaskDetails = document.getElementById("ideaDropdownTaskDetails").value;

                // Call backend to update the task
                await updateTask(taskId, updatedSubject, updatedDescription, ideaDropdownTaskDetails);

                // Hide modal after saving
                modal.hide();

                // Optionally, update the task in the table dynamically
                task.task_subject = updatedSubject;
                task.task_description = updatedDescription;
                taskNameElement.closest('tr').querySelector('td[data-bs-toggle="tooltip"]').setAttribute('title', updatedDescription);
            };
        });
    });
}

async function updateTask(taskId, subject, description, idea) {
    try {
        let response = await frappe.call({
            method: "stpm",
            args: {
                "request": "update_task",
                "data": { "name": taskId, "task_subject": subject, "task_description": description, "idea": idea }
            }
        });
        if (response.message === 'Success') {
            showErrorModal('Task updated successfully!');
        } else {
            showErrorModal('Failed to update task.');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showErrorModal('Error updating task.');
    }
}

async function fetchAllProjects() {
    let response = await frappe.call({ method: "stpm", args: { "request": "fetch_all_projects" } });
    let projects = response.message;

    let accordionExample = document.getElementById("accordionExample");
    accordionExample.innerHTML = `
        <h3>Under Progress Projects</h3>
        <div id="underProgressTable" class="my-3"></div>
        <h3>Made Live Projects</h3>
        <div id="completedTable" class="my-3"></div>
    `;

    let underProgressTable = document.getElementById("underProgressTable");
    let completedTable = document.getElementById("completedTable");

    underProgressTable.innerHTML = '';
    completedTable.innerHTML = '';

    projects.forEach((project, index) => {
        let projectHTML = `
          <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed d-flex justify-content-between align-items-center" type="button" data-bs-toggle="collapse"
                        data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                    
                    <!-- Project name with ellipsis -->
                    <span class="me-auto text-truncate" style="width: 25rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                    ${project.project_name ? project.project_name : project.project_id}
                    </span>
                    
                    <!-- Start date -->
                    <span class="mx-5" style="width: 120px; text-align: right;">
                    ${project.start_date ? project.start_date : "No Start Date"}
                    </span>
                    
                    <!-- End date -->
                    <span class="mx-5" style="width: 120px; text-align: right;">
                    ${project.end_date ? project.end_date : "No Stop Date"}
                    </span>
                    
                    <!-- Team lead -->
                    <span class="mx-5" style="width: 150px; text-align: left;">
                    ${project.tasks[0].tl ? project.tasks[0].tl : "TL NA"}
                    </span>
                    
                    <!-- Completed tasks out of total tasks -->
                    <span class="mx-5" style="width: 100px; text-align: right;">
                    ${project.completed_tasks}/${project.total_tasks}
                    </span>
                    
                    <i class="dropdown-icon"></i>
                </button>
            </h2>
            
            <div id="collapse${index}" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
            <div class="accordion-body">
                <table class="table table-striped">
                ${project.tasks.map(task => `
                    <tr>
                    <!-- Task Subject with ellipsis -->
                    <td style="max-width: 200px; min-width: 200px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                        <span style="color: blue; text-decoration: underline; cursor: pointer;" onclick="showPreview('${task.name}')">
                        ${task.task_subject}
                        </span>
                    </td>
                    
                    <!-- Start Date -->
                    <td style="max-width: 120px; text-align: center;">
                        ${task.start_date ? task.start_date : "Start Date"}
                    </td>
                    
                    <!-- Stop Date -->
                    <td style="max-width: 120px; text-align: center;">
                        ${task.stop_date ? task.stop_date : "Stop Date"}
                    </td>
                    
                    <!-- Assigned To with ellipsis -->
                    <td style="max-width: 150px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-align: center;">
                        ${task.assigned_to ? task.assigned_to : "Unassigned"}
                    </td>
                    
                    <!-- Status -->
                    <td style="max-width: 100px; text-align: center;">
                        ${task.status}
                    </td>
                    
                    <!-- Attachment Icon -->
                    <td style="max-width: 50px; text-align: center;">
                        <i class="bi bi-paperclip" title="Attachments" style="cursor: pointer;" onclick="openAttachmentModal('${task.name}')"></i>
                    </td>
                    </tr>
                `).join('')}
                </table>
            </div>
            </div>
          </div>
        `;

        // Determine if the project is completed or under progress
        if (project.completed_tasks === project.total_tasks) {
            completedTable.innerHTML += projectHTML;
        } else {
            underProgressTable.innerHTML += projectHTML;
        }
    });
}

async function showPreview(task) {
    task = await frappe.call({ method: "stpm", args: { "request": "get_task", "data": { "name": task } } });
    const taskData = task.message.task_doc;
    const files = task.message.files;

    document.getElementById('taskDetailModalLabel').innerHTML = taskData.name;
    document.getElementById('taskName').value = taskData.name;
    document.getElementById('taskSubject').value = taskData.task_subject;
    document.getElementById('taskDescription').value = taskData.task_description || "No description available";
    document.getElementById('startDate').value = taskData.start_date || "";
    document.getElementById('endDate').value = taskData.stop_date || "";
    document.getElementById('assignedTo').value = taskData.assigned_to || "Unassigned";
    document.getElementById('status').value = taskData.status || "Not Started";
    document.getElementById('ratings').value = taskData.ratings || "";
    document.getElementById('remarks').value = taskData.remarks || "";

    if (files.length > 0) {
        document.getElementById('attachments').innerHTML = files.map(attach => `<a href='${attach.file_url}' target='_blank'>${attach.file_name}</a><br>`).join('');
    } else {
        document.getElementById('attachments').innerHTML = 'No attachments.';
    }

    setUpFieldChangeListeners();
    $('#taskDetailModal').modal('show');
}

function setUpFieldChangeListeners() {
    const saveButton = document.getElementById('saveChanges');
    
    // Store original values when modal is opened
    const originalValues = {};
    const inputFields = document.querySelectorAll('#taskDetailModal input, #taskDetailModal select, #taskDetailModal textarea');
    
    inputFields.forEach(field => {
        // Store original value when modal opens
        originalValues[field.id] = field.value;
        
        // Attach event listeners for both 'input' and 'change' events
        field.addEventListener('input', checkChanges);
        field.addEventListener('change', checkChanges);
    });
    
    function checkChanges() {
        // Check if any field's current value differs from its original value
        const hasChanges = Array.from(inputFields).some(field => {
            return field.value !== originalValues[field.id];
        });
        
        // Enable save button only if there are changes
        saveButton.disabled = !hasChanges;
    }
}

function setUpSaveButton() {
    const saveButton = document.getElementById('saveChanges');
    
    saveButton.addEventListener('click', async function () {
        const editedTask = {
            name: document.getElementById('taskName').value,
            description: document.getElementById('taskDescription').value,
            start_date: document.getElementById('startDate').value,
            stop_date: document.getElementById('endDate').value,
            assigned_to: document.getElementById('assignedTo').value,
            status: document.getElementById('status').value,
            ratings: document.getElementById('ratings').value,
            remarks: document.getElementById('remarks').value,
        };
        
        saveButton.disabled = true;
        
        console.log("Edited task", editedTask);
        
        try {
            let response = await frappe.call({
                method: "stpm",
                args: { "request": "update_task", "data": editedTask }
            });
            
            console.log("res", response);
            
            if (response.message) {
                $('#taskDetailModal').modal('hide');
                fetchAllProjects();
            }
        } catch (error) {
            console.error("Error updating task:", error);
            saveButton.disabled = false;
        }
    });
}

// Call these functions when the page loads
function initializeTaskModal() {
    setUpFieldChangeListeners();
    setUpSaveButton();
}

// Call initialization when needed (e.g., when modal is opened)
initializeTaskModal();

document.addEventListener('DOMContentLoaded', function () {
    const addIdeaBtn = document.getElementById('addIdeaBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const addToExistingBtn = document.getElementById('addToExistingBtn');
    const createProjectBtn = document.getElementById('createProjectBtn');
    const dynamicModalLabel = document.getElementById('dynamicModalLabel');
    const modalBody = document.querySelector('.modal-body');
    const saveModalBtn = document.getElementById('saveModalBtn');
    const taskTableBody = document.getElementById('taskTableBody');
    selectedTasks = [];

    const modal = new bootstrap.Modal(document.getElementById('dynamicModal'));

    // Handle task selection
    taskTableBody.addEventListener('change', function (event) {
        if (event.target.classList.contains('task-checkbox')) {
            const taskId = event.target.getAttribute('data-task-id');
            if (event.target.checked) {
                selectedTasks.push(taskId);
            } else {
                const index = selectedTasks.indexOf(taskId);
                if (index > -1) {
                    selectedTasks.splice(index, 1);
                }
            }
        }
    });

    // Open the modal for creating a project
    createProjectBtn.addEventListener('click', function () {
        if (selectedTasks.length === 0) {
            showErrorModal('Please select at least one task to create a project.');
            return;
        }
        setModalContent('createProject');
    });

    addToExistingBtn.addEventListener('click', function () {
        if (selectedTasks.length === 0) {
            showErrorModal('Please select at least one task to add to a project.');
            return;
        }
        setModalContent('addToExisting');
    });

    addTaskBtn.addEventListener('click', function () {
        setModalContent('addTask');
    });

    addIdeaBtn.addEventListener('click', function () {
        setModalContent('addIdea');
    });

    function setModalContent(action) {
        modal.show();
        if (action === 'createProject') {
            let user = frappe.session.user;

            // Use the mapped user, default to "Rajeshwari N" if not found
            user = userMapping[user] || userMapping["default"];

            dynamicModalLabel.textContent = 'Create Project';
            saveModalBtn.textContent = 'Create Project';

            modalBody.innerHTML = `
              <div class="mb-3">
                <label for="projectName" class="form-label">Project Name</label>
                <input type="text" class="form-control" id="projectName" placeholder="Enter Project Name" required>
              </div>
              <div class="mb-3">
                <label for="tl" class="form-label">Team Lead</label>
                <select class="form-select" id="tl">
                  ${["Rajeshwari N", "Nikhil T", "Ragul K"].map(name =>
                `<option value="${name}">${name}</option>`
            ).join('')}
                </select>
              </div>
            `;
        } else if (action === 'addTask') {
            dynamicModalLabel.textContent = 'Add Task';
            saveModalBtn.textContent = 'Add Task';
            modalBody.innerHTML = `
                <div class="mb-3">
                    <label for="taskSubject" class="form-label">Task Subject</label>
                    <input type="text" class="form-control" id="taskSubject" placeholder="Enter task subject" required>
                </div>
                <div class="mb-3">
                    <label for="taskDescription" class="form-label">Task Description</label>
                    <textarea class="form-control" id="taskDescription" rows="3" placeholder="Enter task description"></textarea>
                </div>
                <div class="mb-3">
                    <label for="taskModule" class="form-label">Task Module</label>
                    <input type="text" class="form-control" id="taskModule" rows="3" placeholder="Enter task Module">
                </div>
                <div class="mb-3">
                    <label for="priority" class="form-label">Priority</label>
                    <select class="form-select" id="priority" required>
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low" selected>Low</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="ideaSearch" class="form-label">Select Idea</label>
                    <input type="text" class="form-control" id="ideaSearch" placeholder="Type to search idea">
                    <select class="form-select mt-2" id="ideaDropdown" size="5"></select>
                </div>
            `;
        } else if (action === 'addIdea') {
            dynamicModalLabel.textContent = 'Add Idea';
            saveModalBtn.textContent = 'Add Idea';
            modalBody.innerHTML = `
                <div class="mb-3">
                    <label for="idea" class="form-label">Idea</label>
                    <input type="text" class="form-control" id="idea" placeholder="Enter idea" required>
                </div>
                <div class="mb-3">
                    <label for="ideaDescription" class="form-label">Idea Description</label>
                    <textarea class="form-control" id="ideaDescription" rows="3" placeholder="Enter idea description"></textarea>
                </div>
                <div class="mb-3">
                    <label for="ideaPriority" class="form-label">Priority</label>
                    <select class="form-select" id="ideaPriority" required>
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low" selected>Low</option>
                    </select>
                </div>
            `;
        } else if (action === "addToExisting") {
            dynamicModalLabel.textContent = 'Add To Existing Project';
            saveModalBtn.textContent = 'Add To Project';

            // HTML structure including an input field and a dropdown list
            modalBody.innerHTML = `
                <div class="mb-3">
                    <label for="projectSearch" class="form-label">Select Project</label>
                    <input type="text" class="form-control" id="projectSearch" placeholder="Type to search project" required>
                    <select class="form-select mt-2" id="projectDropdown" size="5"></select>
                </div>
            `;

            // Function to fetch project data from the backend
            async function fetchProjectData() {
                try {
                    let response = await frappe.call({ method: "stpm", args: { "request": "fetch_projects_list" } });
                    let projects = response.message;
                    return projects;
                } catch (error) {
                    console.error('Error fetching project data:', error);
                }
            }

            // Initialize the dropdown with data from the backend
            fetchProjectData().then(projects => {
                const projectDropdown = document.getElementById('projectDropdown');
                const projectSearch = document.getElementById('projectSearch');

                function updateDropdown(filter = '') {
                    projectDropdown.innerHTML = '';
                    projects.filter(project =>
                        project.project_name.toLowerCase().includes(filter.toLowerCase()) ||
                        project.project_id.includes(filter)
                    ).forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.project_id;
                        option.textContent = `${project.project_name} (ID: ${project.project_id})`;
                        projectDropdown.appendChild(option);
                    });
                }

                projectSearch.addEventListener('input', (e) => {
                    updateDropdown(e.target.value);
                });

                projectSearch.addEventListener('change', (e) => {
                    projectSearch.value = e.target.value;
                });

                // Initial population of the dropdown
                updateDropdown();
            });
        }

        // Function to fetch project data from the backend
        async function fetchIdeaData() {
            try {
                let response = await frappe.call({ method: "stpm", args: { "request": "fetch_ideas_list" } });
                let ideas = response.message;
                return ideas;
            } catch (error) {
                console.error('Error fetching idea data:', error);
            }

        }

        // Initialize the dropdown with data from the backend
        fetchIdeaData().then(idea => {
            const ideaDropdown = document.getElementById('ideaDropdown');
            const ideaSearch = document.getElementById('ideaSearch');

            function updateDropdown(filter = '') {
                ideaDropdown.innerHTML = '';
                idea.filter(project =>
                    project.name.toLowerCase().includes(filter.toLowerCase())
                ).forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.name;
                    option.textContent = `${project.name}`;
                    ideaDropdown.appendChild(option);
                });
            }

            ideaSearch.addEventListener('input', (e) => {
                updateDropdown(e.target.value);
            });

            ideaSearch.addEventListener('change', (e) => {
                ideaSearch.value = e.target.value;
            });

            // Initial population of the dropdown
            updateDropdown();
        });
    }

    // Handle save button click (for Add Task or Create Project)
    saveModalBtn.addEventListener('click', function () {
        if (saveModalBtn.textContent === 'Add Task') {
            const taskData = getTaskData();
            if (taskData) {
                addTask(taskData);
            }
        } else if (saveModalBtn.textContent === 'Create Project') {
            const projectData = getProjectData();
            createProject(projectData);
        } else if (saveModalBtn.textContent === 'Add Idea') {
            const ideaData = getIdeaData();
            if (ideaData) createIdea(ideaData);
        } else if (saveModalBtn.textContent === "Add To Project") {
            const selectedProjectAndTasks = addToExistingProjectData();
            addTaskToProject(selectedProjectAndTasks);
        }
        modal.hide();
    });

    // Function to get task data
    function getTaskData() {
        const taskSubject = document.getElementById('taskSubject').value;
        const taskDescription = document.getElementById('taskDescription').value;
        const priority = document.getElementById('priority').value;
        const module = document.getElementById('taskModule').value;
        const ideaDropdown = document.getElementById('ideaDropdown').value;

        // Check if task subject is provided
        if (!taskSubject) {
            showErrorModal('Task Subject is mandatory.');
            return null;
        }

        return {
            taskSubject: taskSubject,
            taskDescription: taskDescription,
            priority: priority,
            module: module,
            ideaName: ideaDropdown,
        };
    }

    // Function to get project data
    function getProjectData() {
        const tl = document.getElementById('tl').value;
        const projectName = document.getElementById('projectName').value;

        return {
            tl,
            projectName: projectName,
            tasks: selectedTasks
        };
    }

    function addToExistingProjectData() {
        const projectDropdown = document.getElementById('projectDropdown').value;

        if (!projectDropdown) showErrorModal('Select a project.');

        return {
            projectId: projectDropdown,
            tasks: selectedTasks
        };
    }

    // Functiomn to get idea data
    function getIdeaData() {
        const idea = document.getElementById('idea').value;
        const ideaDescription = document.getElementById('ideaDescription').value;
        const ideaPriority = document.getElementById('ideaPriority').value;

        if (!idea) {
            showErrorModal('Idea is mandatory.');
            return null;
        }

        return {
            idea: idea,
            ideaDescription: ideaDescription,
            ideaPriority: ideaPriority
        };
    }
});

async function addTaskToProject(data) {
    try {
        let response = await frappe.call({
            method: "stpm",
            args: {
                "request": "add_to_existing_project",
                "data": data
            }
        });

        if (response.message) {
            console.log('Task added to project successfully:', response.message);
            selectedTasks.length = [];
            fetchAllTasks();
            const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicModal'));
            modal.hide();
        }
    } catch (error) {
        console.error('Error creating project:', error);
    }
}

// Function to create project (API call to save project)
async function createProject(data) {
    try {
        let response = await frappe.call({
            method: "stpm",
            args: {
                "request": "create_project",
                "data": data
            }
        });

        if (response.message) {
            console.log('Project created successfully:', response.message);
            selectedTasks.length = [];
            fetchAllTasks();
            fetchAllProjects();
            const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicModal'));
            modal.hide();
        }
    } catch (error) {
        console.error('Error creating project:', error);
    }
}

// Function to add task (API call to save task)
async function addTask(data) {
    try {
        let response = await frappe.call({
            method: "stpm",
            args: {
                "request": "add_task",
                "data": data
            }
        });

        if (response.message) {
            // console.log('Task created successfully:', response.message);
            fetchAllTasks();
            const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicModal'));
            modal.hide();
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

async function createIdea(data) {
    try {
        let response = await frappe.call({
            method: "stpm",
            args: {
                "request": "create_idea",
                "data": data
            }
        });

        if (response.message) {
            // console.log('Idea created successfully:', response.message);
            fetchAllIdeas();
            const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicModal'));
            modal.hide();
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

async function removeIdea(name) {
    try {
        let response = await frappe.call({
            method: "stpm",
            args: {
                "request": "remove_idea",
                "data": { "name": name }
            }
        });

        if (response.message) {
            // console.log('Idea removed successfully:', response.message);
            fetchAllIdeas();
            const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicModal'));
            modal.hide();
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

function showErrorModal(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;  // Set the error message
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    errorModal.show();  // Show the error modal
}

async function fetchUsers() {
    let response = await frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Employee",
            filters: {
                "status": "Active",
                "department": ["like", "%Software%"],
                "designation": ["in", ["Software Engineer", "Web Developer", "Python Developer", "React Developer", "Software Engineer – Associate", "Team Lead - Software engineer"]]
            },
            fields: ["user_id"]
        }
    });

    let users = response.message; // Assuming this contains an array of user objects
    let assignedToSelect = document.getElementById('assignedTo');
    assignedToSelect.innerHTML = ''; // Clear any existing options

    // Append default "Select User" option
    let defaultOption = document.createElement('option');
    defaultOption.textContent = 'Select User';
    defaultOption.value = '';
    assignedToSelect.appendChild(defaultOption);

    // Create and append options for each user
    users.forEach(user => {
        let option = document.createElement('option');
        option.value = user.user_id;
        option.textContent = user.user_id; // Change to a more descriptive field if available
        assignedToSelect.appendChild(option);
    });
}

function openAttachmentModal(taskName) {
    // Save the task name in a global variable or pass it through another mechanism as needed
    window.currentTaskName = taskName;
    const attachmentModal = new bootstrap.Modal(document.getElementById('attachmentModal'));
    attachmentModal.show();
}

async function uploadAttachment() {
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = 1;
    const fileUploadUrl = '/api/method/upload_file';
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        showErrorModal("Please select a file to upload.");
        return;
    }

    // Create a FormData object to handle the file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doctype', "Software Team - Task and Project Management");
    formData.append('docname', window.currentTaskName);
    formData.append('filename', file.name);

    try {
        // Call an API endpoint to handle the file upload
        const fileUploadResponse = await fetch(fileUploadUrl, {
            method: 'POST',
            body: formData,
            headers: {
                "X-Frappe-CSRF-Token": frappe.csrf_token
                // 'Content-Type' should not be set manually for FormData; it is automatically handled
            },
            withCredentials: true
        });

        if (!fileUploadResponse.ok) {
            uploadBtn.disabled = 0;
            showErrorModal('File upload failed');
            return;
        }

        const data = await fileUploadResponse.json();
        showErrorModal("File uploaded successfully!");
        console.log(data); // Handle the response as needed

        // Optionally close the modal
        const attachmentModal = bootstrap.Modal.getInstance(document.getElementById('attachmentModal'));
        if (attachmentModal) {
            attachmentModal.hide();
        }
    } catch (error) {
        console.error("Error uploading file:", error);
        showErrorModal("Failed to upload the file. Please try again.");
    }
}

async function getUsers() {
    let data = await frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "User",
            fields: ["name", "full_name"],
            filters: {
                "app_user_type": "Novel Employee"
            },
            limit_page_length: 0
        }
    });

    data.message.forEach(user => {
        userMapping[user.name] = user.full_name;
    });
    return "";
}
