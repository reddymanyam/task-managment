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
                    limit_page_length: 20,
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
                            <select class="form-control" id="task-status">
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
                            <input type="text" class="form-control" id="task-priority" value="${task.priority || ''}" />
                        </div>
                        <div class="form-group">
                            <label><strong>Progress (%):</strong></label>
                            <input type="number" class="form-control" id="task-progress" value="${task.progress || 0}" />
                        </div>
                        <div class="form-group">
                            <label><strong>Expected Start Date:</strong></label>
                            <input type="date" class="form-control" id="task-exp-start-date" value="${task.exp_start_date || ''}" />
                        </div>
                        <div class="form-group">
                            <label><strong>Expected End Date:</strong></label>
                            <input type="date" class="form-control" id="task-exp-end-date" value="${task.exp_end_date || ''}" />
                        </div>
                        
                    </div>
                    <div class="form-group mt-3">
                        <label><strong>Task Description:</strong></label>
                        <textarea class="form-control" id="task-description" rows="4">${task.description || ''}</textarea>
                    </div>
                    <button type="button" class="btn btn-primary mt-3" id="update-task">Update</button>
                `;

                const taskDetailsModal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));
                taskDetailsModal.show();

                // Add event listener for update button
                document.getElementById('update-task').addEventListener('click', async () => {
                    const updatedTaskData = {
                        name: document.getElementById('task-id').value,
                        subject: document.getElementById('task-subject').value,
                        status: document.getElementById('task-status').value,
                        team: document.getElementById('task-team').value,
                        priority: document.getElementById('task-priority').value,
                        exp_start_date: document.getElementById('task-exp-start-date').value,
                        exp_end_date: document.getElementById('task-exp-end-date').value,
                        progress: document.getElementById('task-progress').value,
                        description: document.getElementById('task-description').value,
                    };

                    try {
                        const response = await frappe.call({
                            method: "frappe.client.get",
                            args: {
                                doctype: "Task",
                                doc: {
                                    fields:updatedTaskData
                                }
                            }
                        });

                        if (response.message) {
                            // Update the table row with new data
                            const updatedRow = document.querySelector(`tr[data-id="${updatedTaskData.name}"]`);
                            if (updatedRow) {
                                updatedRow.cells[1].textContent = updatedTaskData.subject || 'N/A';
                                const statusButton = updatedRow.cells[2].querySelector('button');
                                statusButton.textContent = updatedTaskData.status || 'Pending';
                                statusButton.className = `btn btn-${updatedTaskData.status === 'Completed' ? 'success' : 'warning'} btn-sm`;
                            }

                            // Close the modal
                            const taskDetailsModal = bootstrap.Modal.getInstance(document.getElementById('taskDetailsModal'));
                            taskDetailsModal.hide();

                            // Optional: Show a success message
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

    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskData = {
            subject: document.getElementById('task-subject').value,
            status: document.getElementById('task-status').value,
            assigned_to: document.getElementById('task-assigned-to').value,
            exp_end_date: document.getElementById('task-end-date').value,
        };

        try {
            const response = await frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "Task",
                        ...taskData,
                    },
                },
            });

            if (response.message) {
                addTaskToTable(response.message);
                attachRowClickEvents();
                addTaskModal.hide();
                addTaskForm.reset();
            }
        } catch (error) {
            console.error("Error adding task:", error);
        }
    });

    await fetchTotalPages();
});