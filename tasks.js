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
                    <div class="form-group">
                        <label><strong>ID:</strong></label>
                        <input type="text" class="form-control" value="${task.name}" readonly />
                    </div>
                    <div class="form-group">
                        <label><strong>Subject:</strong></label>
                        <input type="text" class="form-control" value="${task.subject || 'N/A'}" readonly />
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
                        <label><strong>Assigned To:</strong></label>
                        <input type="text" class="form-control" id="task-assigned-to" value="${task.assigned_to || 'Unassigned'}" />
                    </div>
                    <div class="form-group">
                        <label><strong>Expected End Date:</strong></label>
                        <input type="date" class="form-control" id="task-exp-end-date" value="${task.exp_end_date || ''}" />
                    </div>
                    <button type="button" class="btn btn-primary" id="update-task">Update</button>
                `;

                const taskDetailsModal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));
                taskDetailsModal.show();

                // Add event listener for the Update button
                document.getElementById('update-task').addEventListener('click', async () => {
                    const updatedTask = {
                        status: document.getElementById('task-status').value,
                        assigned_to: document.getElementById('task-assigned-to').value,
                        exp_end_date: document.getElementById('task-exp-end-date').value,
                    };

                    try {
                        const updateResponse = await frappe.call({
                            method: "frappe.client.set_value",
                            args: {
                                doctype: "Task",
                                name: taskId,
                                fieldname: updatedTask,
                            },
                        });

                        if (updateResponse.message) {
                            // Update the row in the table
                            const row = document.querySelector(`tr[data-id="${taskId}"]`);
                            if (row) {
                                row.children[2].innerHTML = `
                                    <button class="btn btn-${updatedTask.status === 'Completed' ? 'success' : 'warning'} btn-sm">
                                        ${updatedTask.status}
                                    </button>
                                `;
                                row.children[3].textContent = updatedTask.assigned_to || 'Unassigned';
                                row.children[4].textContent = updatedTask.exp_end_date || 'N/A';
                            }
                            taskDetailsModal.hide();
                        }
                    } catch (error) {
                        console.error("Error updating task:", error);
                    }
                });
            } else {
                console.error("No details found for this task.");
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

    fetchTotalPages();
});