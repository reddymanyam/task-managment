document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('task-table-body');
    const addTaskForm = document.getElementById('add-task-form');
    const addTaskModal = new bootstrap.Modal(document.getElementById('addTaskModal'));

    async function fetchTotalPages() {
        try {
            const response = await frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Task",
                    fields: ["name", "status", "assigned_to", "exp_end_date", "subject"],
                    limit_page_length: 40,
                },
            });

            if (response.message && response.message.length > 0) {
                response.message.forEach(task => {
                    addTaskToTable(task);
                });
                attachRowClickEvents();
            } else {
                tbody.innerHTML = '<tr><td colspan="8">No tasks found.</td></tr>';
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            tbody.innerHTML = '<tr><td colspan="8">Error fetching data.</td></tr>';
        }
    }

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
                                <option value="N/A" ${task.status === 'N/A' ? 'selected' : ''}>N/A</option>
                                <option value="Open" ${task.status === 'Open' ? 'selected' : ''}>Open</option>
                                <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${task.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><strong>Team:</strong></label>
                            <input type="text" class="form-control" id="task-team" value="${task.team || ''}" readonly />
                        </div>
                        <div class="form-group">
                            <label><strong>Priority:</strong></label>
                            <input type="text" class="form-control task-field" id="task-priority" value="${task.priority || ''}" data-original="${task.priority || ''}" />
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
                    
                    // Only include changed fields
                    editableFields.forEach(field => {
                        if (field.value !== originalValues.get(field.id)) {
                            const fieldName = field.id.replace('task-', '');
                            updatedFields[fieldName] = field.value;
                        }
                    });

                    // If no fields were changed, return early
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
                            // Update the table row with new data
                            const updatedRow = document.querySelector(`tr[data-id="${document.getElementById('task-id').value}"]`);
                            if (updatedRow) {
                                // Update subject if it was changed
                                if (updatedFields.subject) {
                                    updatedRow.cells[1].textContent = updatedFields.subject || 'N/A';
                                }
                                // Update status if it was changed
                                if (updatedFields.status) {
                                    const statusButton = updatedRow.cells[2].querySelector('button');
                                    statusButton.textContent = updatedFields.status || 'Pending';
                                    statusButton.className = `btn btn-${updatedFields.status === 'Completed' ? 'success' : 'warning'} btn-sm`;
                                }
                            }

                            // Close the modal
                            const taskDetailsModal = bootstrap.Modal.getInstance(document.getElementById('taskDetailsModal'));
                            taskDetailsModal.hide();

                            // Show success message
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

    // Event listener for Add Task button
    document.getElementById('add-task-btn').addEventListener('click', () => {
        const addTaskModal = new bootstrap.Modal(document.getElementById('addTaskModal'));
        addTaskModal.show();
    });
    
    // Add Task Form Submission Handler
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate required fields
        const requiredFields = ['task-subject', 'task-status', 'task-assigned-to'];
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
        
        if (!isValid) {
            alert('Please fill in all required fields.');
            return;
        }

        // Capture the new task data from the form
        const taskData = {
            subject: document.getElementById('task-subject').value,
            status: document.getElementById('task-status').value,
            team: document.getElementById('task-team').value,
            priority: document.getElementById('task-priority').value,
            assigned_to: document.getElementById('task-assigned-to').value,
            exp_start_date: document.getElementById('task-start-date').value,
            exp_end_date: document.getElementById('task-end-date').value,
            progress: document.getElementById('task-progress').value,
            description: document.getElementById('task-description').value,
        };

        try {
            // Make the API call to create the new task
            const response = await frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "Task",
                        ...taskData, // Spread the form data into the API call
                    },
                },
            });

            if (response.message) {
                // Add the new task to the table
                addTaskToTable(response.message);
                
                // Re-attach click events to ensure the new row is interactive
                attachRowClickEvents();
                
                // Hide the modal
                addTaskModal.hide();
                
                // Reset the form
                addTaskForm.reset();
                
                // Optional: Show a success message
                alert('Task added successfully!');
            }
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Failed to add task. Please check your inputs and try again.");
        }
    });

    // Initial fetch of tasks
    await fetchTotalPages();
});




/***********

// Get List
const response = await frappe.call({
    method: "frappe.client.get_list",
    args: {
        doctype: "Task",
        filters: {
            "status": "Completed"
        },
        fields: ["name", "status", "assigned_to", "exp_end_date", "subject"],
        limit_page_length: 20,
    },
});

// Get Doc
const response = await frappe.call({
    method: "frappe.client.get",
    args: {
        doctype: "Task",
        name: "TASK-2023-01249" // ID
    },
});

// Save Doc
const response = await frappe.call({
    method: "frappe.client.save",
    args: {
        doctype: "Task",
        "status": "Completed"
    },
});

// New Doc
const response = await frappe.call({
    method: "frappe.client.insert",
    args: {
        doctype: "Task",
        "subject": "Test",
        "description": "Testing",
        "team": "Software" // ... etc. We need to fill all the mandatory fields, else we will get an error.
    },
});

*********************/