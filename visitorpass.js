const verifyButton = document.getElementById("verifybtn");
const otpInput = document.getElementById("otp");
const messageDiv = document.getElementById("message");
const firstSection = document.getElementById("first-section");

function formatDate(date) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-GB', options);
}


function getStatusDisplay(status) {
    const statusConfigs = {
        'Approved': { color: '#ffffff', backgroundColor: '#228B22' },
        'Pending': { color: '#000000', backgroundColor: '#FFBF00' },
        'Rejected': { color: '#ffffff', backgroundColor: '#FF0000' },
        'Date Missmatch':{color:'#ffffff', backgroundColor: '#FF0000'}
    };

    return `
        <div class="status-circle" style="
            width: 200px;
            height: 200px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
            text-align:center;
            background-color: ${statusConfigs[status]?.backgroundColor || '#686868'};
            color: ${statusConfigs[status]?.color || '#ffffff'};
            font-weight: bold;
            font-size: 2em;
            box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
        ">
            ${status}
        </div>
    `;
}

function displayVisitorInfo(visitorData) {
    const today = formatDate(new Date());
    const visitDate = formatDate(visitorData.date_of_visit);

    let status = visitorData.status;
    if (visitDate !== today) {
        status = 'Date Missmatch';
    }

    firstSection.innerHTML = `
        <div style="
            padding: 10px;
            margin: 0 auto;
            font-family: Arial, sans-serif;
        ">
            <h2 style="color: #333; font-size:30px; margin-bottom: 20px; text-align:center;">
                Visitor Pass Details
            </h2>
            
            <div style="
                background: white;
                border-radius: 10px;
                padding: 2px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <div style="display: flex; justify-content: space-between;">
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold; color: #666;">Visitor Name:</label>
                        <div style="font-size: 1.1em; color: #333;">${visitorData.visitor_name}</div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold; color: #666;">Date of Visit:</label>
                        <div style="font-size: 1.1em; color: #333;">${visitDate}</div>
                    </div>
                </div>    

                <div style="margin-top: 20px; display: flex; justify-content: center;">
                    ${getStatusDisplay(status)}
                </div>
            </div>

            <div class="mt-4 flex justify-center">
                <button id="backbtn" class="bg-purple-800 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                    Back
                </button>
            </div>
        </div>
    `;

    // Add event listener to the new back button
    document.getElementById("backbtn").addEventListener('click', resetToOTPPage);
}

function resetToOTPPage() {
    firstSection.innerHTML = `
        <div class="p-4 font-semibold text-xl flex justify-center">
            <h3><span class="text-purple-800">Visitor Pass</span> & Status</h3>
        </div>

        <div class="mt-4 w-72">
            <label for="otp" class="block text-xl font-medium text-black-900">Enter 6-Digit OTP</label>
            <input type="text" id="otp" name="otp" maxlength="6" pattern="\d*" class="mt-1 block w-full p-3 text-2xl border-2 border-black rounded-md focus:outline-none" placeholder="Enter OTP" />
            <div id="message"></div>
        </div>

        <div class="mt-4">
            <button class="bg-purple-800 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" id="verifybtn">Verify</button>
        </div>
    `;

    // Reattaching event listeners to the new elements                   //this is because of while writting innerhtml, the dom complete replaces, then there is no element(buttons) in the dom, so get them back to functionality we use them, by again attaching
    // const newVerifyButton = document.getElementById("verifybtn");
    // const newOtpInput = document.getElementById("otp");

    // newVerifyButton.addEventListener('click', handleVerification);
    // newOtpInput.addEventListener('input', handleInputChange);

    firstSection.addEventListener('click', function (event) {            //event delegation
        if (event.target.id === "verifybtn") {                          //when the inner html contant changes, then we  need to attach event handlers again and again due to dom, but by using event delegaton we no need to attach them again and again.
            handleVerification();
        }
    });
    
}

function handleVerification() {
    const otp = document.getElementById("otp").value.trim();
    const messageDiv = document.getElementById("message");
    
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
                document.getElementById("verifybtn").style.display = "none";
            }
        }
    });
}

function handleInputChange() {
    const messageDiv = document.getElementById("message");
    const verifyButton = document.getElementById("verifybtn");
    
    messageDiv.textContent = '';
    verifyButton.style.display = "inline-block";
}

// Initial event listeners
verifyButton.addEventListener('click', handleVerification);
otpInput.addEventListener('input', handleInputChange);