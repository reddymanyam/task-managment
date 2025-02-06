const verifyButton = document.getElementById("verifybtn");
const otpInput = document.getElementById("otp");
const messageDiv = document.getElementById("message");

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function getStatusDisplay(status) {
    const statusConfigs = {
        'Approved': { color: '#28a745', backgroundColor: '#e6ffe6' },
        'Pending': { color: '#ffc107', backgroundColor: '#fff9e6' },
        'Rejected': { color: '#dc3545', backgroundColor: '#ffe6e6' }
    };

    return `
        <div class="status-container" style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background-color: ${statusConfigs[status]?.backgroundColor || '#f8f9fa'};
            border-radius: 8px;
            margin: 10px 0;
        ">
            <div class="status-circle" style="
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background-color: ${statusConfigs[status]?.color || '#6c757d'};
            "></div>
            <span style="
                font-weight: 500;
                color: ${statusConfigs[status]?.color || '#6c757d'};
            ">${status}</span>
        </div>
    `;
}

function displayVisitorInfo(visitorData) {
    const today = formatDate(new Date());
    const visitDate = formatDate(new Date(visitorData.date_of_visit));

    let status = visitorData.status;
    if (visitDate !== today) {
        status = 'Rejected';
    }

    const resultPage = `

        <div style="
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
            font-family: Arial, sans-serif;
        ">
            <h2 style="color: #333; margin-bottom: 20px;">Visitor Pass Details</h2>
            
            <div style="
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #666;">Visitor Name:</label>
                    <div style="font-size: 1.1em; color: #333;">${visitorData.visitor_name}</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #666;">Date of Visit:</label>
                    <div style="font-size: 1.1em; color: #333;">${visitDate}</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #666;">Status:</label>
                    ${getStatusDisplay(status)}
                </div>
            </div>
        </div>
    `;

    // Replace current page content with the result
    document.body.innerHTML = resultPage;
}

verifyButton.addEventListener('click', function () {
    console.log("button clicked");
    const otp = otpInput.value.trim();
    if (!otp) {
        messageDiv.textContent = 'Please enter a valid OTP';
        messageDiv.style.color = 'red';
        return;
    }

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: 'Visitor Pass',
            filters: {
                name: `VP${otp}`
            },
            fields: ['visitor_name', 'status', 'date_of_visit']
        },
        callback: function (response) {
            if (response.message && response.message.length > 0) {
                const visitorData = response.message[0];
                displayVisitorInfo(visitorData);
            } else {
                messageDiv.textContent = 'No Record Found';
                messageDiv.style.color = 'red';
                messageDiv.style.fontSize = '2rem';
                messageDiv.style.fontWeight = 'bold';
                verifyButton.style.display = "none";
            }
        }
    });
});

// Reset message and button when input changes
otpInput.addEventListener('input', function () {
    messageDiv.textContent = '';
    verifyButton.style.display = "inline-block";
});