document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('task-table-body');
    const addTaskModal = new bootstrap.Modal(document.getElementById('addTaskModal'));
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const teamInput = document.getElementById('task-team');
    const teamSuggestions = document.getElementById('team-suggestions');

    // Pagination state
    let currentPage = 1;
    let totalPages = 1;
    const PAGE_SIZE = 20;

    // Initialize team suggestions
    let teams = new Set();

    // Fetch unique teams from existing tasks
    async function fetchTeams() {
        try {
            const response = await frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Task",
                    fields: ["team"],
                    limit_page_length: 0
                }
            });

            // Clear existing teams
            teams.clear();

            // Add non-empty team values to the Set
            response.message.forEach(task => {
                if (task.team) {
                    teams.add(task.team);
                }
            });

            // Convert Set to Array and update suggestions
            updateTeamSuggestions([...teams].sort());
        } catch (error) {
            console.error("Error fetching teams:", error);
        }
    }

    // Update datalist with team suggestions
    function updateTeamSuggestions(teamArray) {
        teamSuggestions.innerHTML = '';
        teamArray.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            teamSuggestions.appendChild(option);
        });
    }

    // Filter teams based on input
    teamInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        const filteredTeams = [...teams].filter(team =>
            team.toLowerCase().includes(value)
        );
        updateTeamSuggestions(filteredTeams);
    });

    // Fetch teams when the add task modal is shown
    document.getElementById('add-task-btn').addEventListener('click', () => {
        fetchTeams();
        initDependenciesTable();
        addTaskModal.show();
    });

    // Add this to your existing DOMContentLoaded event listener

    const addDependencyRow = () => {
        const tbody = document.querySelector('#dependencies-table tbody');
        const rowCount = tbody.children.length + 1;

        const newRow = document.createElement('tr');
        newRow.innerHTML = `
        <td><input type="checkbox" class="dependency-checkbox"></td>
        <td>${rowCount}</td>
        <td>
            <select class="form-select dependency-task">
                <option value="">Select Task</option>
            </select>
        </td>
        <td class="dependency-subject"></td>
        <td>
            <button type="button" class="btn btn-danger btn-sm delete-row">
                <i class="bi bi-trash"></i> Delete
            </button>
        </td>
    `;

        tbody.appendChild(newRow);

        // Fetch and populate tasks in the new select
        updateTaskSelect(newRow.querySelector('.dependency-task'));

        // Add delete button event listener
        newRow.querySelector('.delete-row').addEventListener('click', () => {
            deleteRow(newRow);
        });
    };

    // Function to delete a row
    const deleteRow = (row) => {
        if (confirm('Are you sure you want to delete this dependency?')) {
            row.remove();
            updateRowNumbers();
        }
    };

    // Function to update row numbers after deletion
    const updateRowNumbers = () => {
        const rows = document.querySelectorAll('#dependencies-table tbody tr');
        rows.forEach((row, index) => {
            row.querySelector('.row-number').textContent = index + 1;
        });
    };

    // Function to fetch and populate task options
    const updateTaskSelect = async (selectElement) => {
        try {
            const response = await frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Task",
                    fields: ["name", "subject"],
                    limit_page_length: 0
                }
            });

            if (response.message) {
                response.message.forEach(task => {
                    const option = document.createElement('option');
                    option.value = task.name;
                    option.textContent = task.name;
                    selectElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    // Handle task selection change
    const handleTaskSelection = async (event) => {
        const select = event.target;
        const subjectCell = select.closest('tr').querySelector('.dependency-subject');

        if (select.value) {
            try {
                const response = await frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Task",
                        name: select.value
                    }
                });

                if (response.message) {
                    subjectCell.textContent = response.message.subject || 'N/A';
                }
            } catch (error) {
                console.error("Error fetching task details:", error);
                subjectCell.textContent = 'Error loading subject';
            }
        } else {
            subjectCell.textContent = '';
        }
    };

    // Initialize the dependencies table
    const initDependenciesTable = () => {
        // Clear existing table content
        const tbody = document.querySelector('#dependencies-table tbody');
        tbody.innerHTML = '';

        // Add initial row
        addDependencyRow();

        // Add event listener for the "Add Row" button
        document.getElementById('add-dependency-row').addEventListener('click', addDependencyRow);

        // Add event delegation for task selection changes
        document.querySelector('#dependencies-table').addEventListener('change', (event) => {
            if (event.target.classList.contains('dependency-task')) {
                handleTaskSelection(event);
            }
        });
    };
    // Rest of your existing code...
    async function fetchTotalCount() {
        try {
            const response = await frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Task",
                    fields: ["name"],
                    limit_page_length: 0,
                },
            });
            return response.message ? response.message.length : 0;
        } catch (error) {
            console.error("Error fetching total count:", error);
            return 0;
        }
    }

    async function fetchPageData(page) {
        try {
            const start = (page - 1) * PAGE_SIZE;
            const response = await frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Task",
                    fields: ["name", "status", "assigned_to", "exp_end_date", "subject"],
                    limit_start: start,
                    limit_page_length: PAGE_SIZE,
                },
            });

            tbody.innerHTML = '';

            if (response.message && response.message.length > 0) {
                response.message.forEach(task => {
                    addTaskToTable(task);
                });
                attachRowClickEvents();
            } else {
                tbody.innerHTML = '<tr><td colspan="5">No tasks found.</td></tr>';
            }

            updatePaginationControls();
        } catch (error) {
            console.error("Error fetching data:", error);
            tbody.innerHTML = '<tr><td colspan="5">Error fetching data.</td></tr>';
        }
    }

    function updatePaginationControls() {
        currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    async function initializePagination() {
        const totalCount = await fetchTotalCount();
        totalPages = Math.ceil(totalCount / PAGE_SIZE);
        await fetchPageData(currentPage);
    }

    prevPageBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
            currentPage--;
            await fetchPageData(currentPage);
        }
    });

    nextPageBtn.addEventListener('click', async () => {
        if (currentPage < totalPages) {
            currentPage++;
            await fetchPageData(currentPage);
        }
    });

    function addTaskToTable(task) {
        const row = document.createElement('tr');
        row.classList.add('clickable-row');
        row.setAttribute('data-id', task.name);

        row.innerHTML = `
            <td>${task.name}</td>
            <td>${task.subject || 'N/A'}</td>
            <td>
                <button class="btn btn-${task.status === 'Completed' ? 'success' : 'warning'} btn-sm">
                    ${task.status || 'Pending'}
                </button>
            </td>
            <td>${task.assigned_to || 'Unassigned'}</td>
            <td>${task.exp_end_date || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    }

    function attachRowClickEvents() {
        const rows = document.querySelectorAll('.clickable-row');
        rows.forEach(row => {
            row.addEventListener('click', async () => {
                const taskId = row.getAttribute('data-id');
                if (taskId) {
                    await fetchTaskDetails(taskId);
                }
            });
        });
    }

    async function fetchTaskDetails(taskId) {
        try {
            const response = await frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Task",
                    name: taskId,
                },
            });

            if (response.message) {
                const task = response.message;
                const modalContent = document.getElementById('task-details-modal-content');
                modalContent.innerHTML = `
                    <div class="grid-container">
                        <div class="form-group">
                            <label><strong>ID:</strong></label>
                            <input type="text" class="form-control" id="task-id" value="${task.name}" readonly />
                        </div>
                        <div class="form-group">
                            <label><strong>Subject:</strong></label>
                            <input type="text" class="form-control" id="task-subject" value="${task.subject || 'N/A'}" readonly />
                        </div>
                        <div class="form-group">
                            <label><strong>Status:</strong></label>
                            <select class="form-control task-field" id="task-status" data-original="${task.status || ''}">
                                <option value="Open" ${task.status === 'Open' ? 'selected' : ''}>Open</option>
                                <option value="Working" ${task.status === 'Working' ? 'selected' : ''}>Working</option>
                                <option value="Pending Review" ${task.status === 'Pending Review' ? 'selected' : ''}>Pending Review</option>
                                <option value="Overdue" ${task.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
                                <option value="Template" ${task.status === 'Template' ? 'selected' : ''}>Template</option>
                                <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${task.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><strong>Team:</strong></label>
                            <input type="text" class="form-control task-field" id="task-team" value="${task.team || ''}" list="team-suggestions-edit" />
                            <datalist id="team-suggestions-edit"></datalist>
                        </div>
                        <div class="form-group">
                            <label><strong>Priority:</strong></label>
                            <select class="form-control task-field" id="task-priority" data-original="${task.priority || ''}">
                                <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
                                <option value="Medium" ${task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                                <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
                                <option value="Urgent" ${task.priority === 'Urgent' ? 'selected' : ''}>Urgent</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><strong>Progress (%):</strong></label>
                            <input type="number" class="form-control task-field" id="task-progress" value="${task.progress || 0}" data-original="${task.progress || 0}" />
                        </div>
                        <div class="form-group">
                            <label><strong>Expected Start Date:</strong></label>
                            <input type="date" class="form-control" id="task-exp-start-date" value="${task.exp_start_date || ''}" readonly />
                        </div>
                        <div class="form-group">
                            <label><strong>Expected End Date:</strong></label>
                            <input type="date" class="form-control" id="task-exp-end-date" value="${task.exp_end_date || ''}" readonly />
                        </div>
                    </div>
                    <div class="form-group mt-3">
                        <label><strong>Task Description:</strong></label>
                        <textarea class="form-control task-field" id="task-description" rows="4" data-original="${task.description || ''}">${task.description || ''}</textarea>
                    </div>
                    <button type="button" class="btn btn-primary mt-3" id="update-task" disabled>Update</button>
                `;

                const taskDetailsModal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));
                taskDetailsModal.show();

                // Fetch teams for the edit modal
                fetchTeams();

                // Track changes in editable fields
                const editableFields = document.querySelectorAll('.task-field');
                const updateButton = document.getElementById('update-task');

                // Store original values and track changes
                const originalValues = new Map();
                editableFields.forEach(field => {
                    originalValues.set(field.id, field.value);

                    field.addEventListener('input', () => {
                        let hasChanges = false;
                        editableFields.forEach(f => {
                            if (f.value !== originalValues.get(f.id)) {
                                hasChanges = true;
                            }
                        });
                        updateButton.disabled = !hasChanges;
                    });
                });

                // Add event listener for update button
                document.getElementById('update-task').addEventListener('click', async () => {
                    const updatedFields = {};

                    editableFields.forEach(field => {
                        if (field.value !== originalValues.get(field.id)) {
                            const fieldName = field.id.replace('task-', '');
                            updatedFields[fieldName] = field.value;
                        }
                    });

                    if (Object.keys(updatedFields).length === 0) {
                        alert('No changes detected.');
                        return;
                    }

                    try {
                        const response = await frappe.call({
                            method: "frappe.client.set_value",
                            args: {
                                doctype: "Task",
                                name: document.getElementById('task-id').value,
                                fieldname: updatedFields
                            }
                        });

                        if (response.message) {
                            const updatedRow = document.querySelector(`tr[data-id="${document.getElementById('task-id').value}"]`);
                            if (updatedRow) {
                                if (updatedFields.subject) {
                                    updatedRow.cells[1].textContent = updatedFields.subject || 'N/A';
                                }
                                if (updatedFields.status) {
                                    const statusButton = updatedRow.cells[2].querySelector('button');
                                    statusButton.textContent = updatedFields.status || 'Pending';
                                    statusButton.className = `btn btn-${updatedFields.status === 'Completed' ? 'success' : 'warning'} btn-sm`;
                                }
                            }

                            const taskDetailsModal = bootstrap.Modal.getInstance(document.getElementById('taskDetailsModal'));
                            taskDetailsModal.hide();

                            alert('Task updated successfully!');
                        }
                    } catch (error) {
                        console.error("Error updating task:", error);
                        alert('Failed to update task. Please try again.');
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching task details:", error);
        }
    }

    // Initialize the page
    await initializePagination();
});