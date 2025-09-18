let web3;
let account;
let contract;
let userRole; 

let currentManagingStudentId = null; 
let currentManagingStudentName = null;

window.addEventListener('load', async () => {
    await initApp();
});

async function initApp() {
    const statusDiv = document.getElementById('status');
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            account = accounts[0];
            await handleConnection();
        } else {
            showWelcomeScreen();
        }
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) location.reload();
            else if (accounts[0] !== account) location.reload();
        });
        window.ethereum.on('chainChanged', () => location.reload());
    } else {
        statusDiv.innerHTML = `<span style="color: #ef4444;">MetaMask not detected</span> <a href="https://metamask.io/download/" target="_blank" style="margin-left: 10px; color: #8b5cf6;">Install MetaMask</a>`;
    }
    document.getElementById('connectBtn').onclick = connectMetaMask;
}

function showWelcomeScreen() {
    document.getElementById('status').innerHTML = `<span style="color: #f59e0b;">MetaMask not connected</span>`;
    document.getElementById('welcome').classList.add('active');
    document.querySelectorAll('.role-view').forEach(div => div.classList.remove('active'));
}

async function connectMetaMask() {
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        account = accounts[0];
        await handleConnection();
    } catch (error) {
        console.error('Connection rejected:', error);
        document.getElementById('status').innerHTML = `<span style="color: #ef4444;">Connection rejected</span>`;
    }
}

async function handleConnection() {
    document.getElementById('status').innerHTML = `<div class="status-dot"></div><span>Connected: <span class="address">${account.substring(0, 6)}...${account.substring(38)}</span></span>`;
    try {
        const artifact = await fetch('../build/contracts/StudentTeacherManagement.json').then(res => res.json());
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = artifact.networks[networkId];

        if (!deployedNetwork) {
            document.getElementById('status').innerHTML = `<span style="color: #ef4444;">Contract not deployed on this network. Check Ganache/network and contract deployment.</span>`;
            return;
        }
        contract = new web3.eth.Contract(artifact.abi, deployedNetwork.address);
        await initRoleView();
    } catch (error) {
        console.error('Contract loading error:', error);
        document.getElementById('status').innerHTML = `<span style="color: #ef4444;">Error loading contract: ${error.message}. Ensure ABI is correct and contract is deployed.</span>`;
    }
}

async function initRoleView() {
    try {
        userRole = await contract.methods.getMyRole().call({ from: account });
        console.log("User role:", userRole);

        document.getElementById('welcome').classList.remove('active');
        document.querySelectorAll('.role-view').forEach(div => div.classList.remove('active'));

        if (userRole === 'Admin') {
            document.getElementById('adminView').classList.add('active');
            await setupAdminUI();
        } else if (userRole === 'Teacher') {
            document.getElementById('teacherView').classList.add('active');
            const tinfo = await contract.methods.getTeacherInfo().call({ from: account });
            document.getElementById('teacherIdDisplay').textContent = `Name: ${tinfo.name}`;
            await setupTeacherUI();
        } else if (userRole === 'Student') {
            document.getElementById('studentView').classList.add('active');
            const studentId = await contract.methods.getMyId().call({ from: account });
            document.getElementById('studentIdDisplay').textContent = `ID: ${studentId}`;
            await setupStudentUI();
        } else {
            document.getElementById('welcome').classList.add('active');
            document.querySelector('#welcome p').textContent = 'Your address is not registered. Please contact an admin.';
            document.getElementById('connectBtn').style.display = 'none';
        }
    } catch (error) {
        console.error('Role detection or setup error:', error);
        document.getElementById('status').innerHTML = `<span style="color: #ef4444;">Error determining role or setting up UI: ${error.message}</span>`;
        document.getElementById('welcome').classList.add('active');
        document.querySelector('#welcome p').textContent = 'Error initializing your view. Please ensure you are on the correct network and try again.';
    }
}

function parseScoreInput(value) {
    if (value === '') return 200;
    const num = parseInt(value);
    if (isNaN(num) || num < 0 || num > 100) {
        throw new Error(`Invalid score: ${value}. Must be 0-100 or blank.`);
    }
    return num;
}

function formatScore(score) {
    const numericScore = parseInt(score); 
    return numericScore === 200 ? '-' : numericScore;
}

// =================== Admin UI ===================
async function setupAdminUI() {
    const assignTeacherSelect = document.getElementById('assignTeacherSelect');
    const assignStudentSelect = document.getElementById('assignStudentSelect');
    assignTeacherSelect.innerHTML = '<option value="">Loading Teachers...</option>';
    assignStudentSelect.innerHTML = '<option value="">Loading Students...</option>';

    try {
        assignTeacherSelect.innerHTML = '<option value="">Select Teacher ID</option>';
        const teacherIds = await contract.methods.getAllTeachers().call({ from: account });
        for (const tid of teacherIds) {
            const teacher = await contract.methods.getTeacherInfo(tid).call({ from: account });
            let opt = new Option(`ID: ${tid} - ${teacher.name} (${teacher.teacherAddress.substring(0,6)}...)`, tid);
            assignTeacherSelect.add(opt);
        }
        if (teacherIds.length === 0) assignTeacherSelect.innerHTML = '<option value="">No teachers found.</option>';

        assignStudentSelect.innerHTML = '<option value="">Select Student ID</option>';
        const studentIds = await contract.methods.getAllStudents().call({ from: account });
        for (const sid of studentIds) {
            const student = await contract.methods.getStudentInfo(sid).call({ from: account });
            let opt = new Option(`ID: ${sid} - ${student.name} (${student.studentAddress.substring(0,6)}...)`, sid);
            assignStudentSelect.add(opt);
        }
        if (studentIds.length === 0) assignStudentSelect.innerHTML = '<option value="">No students found.</option>';
    } catch (error) {
        console.error("Error populating admin dropdowns:", error);
        assignTeacherSelect.innerHTML = `<option value="">Error loading teachers: ${error.message}</option>`;
        assignStudentSelect.innerHTML = `<option value="">Error loading students: ${error.message}</option>`;
    }

    document.getElementById('addTeacherBtn').onclick = async () => {
        const addr = document.getElementById('teacherAddress').value.trim();
        const name = document.getElementById('teacherName').value.trim();
        const age = document.getElementById('teacherAge').value;
        if (addr && name && age && web3.utils.isAddress(addr) && parseInt(age) >= 18) {
            try {
                await contract.methods.addTeacher(name, age, addr).send({ from: account });
                alert(`Teacher added successfully`);
                setupAdminUI(); 
            } catch (error) { alert("Error adding teacher: " + error.message); }
        } else { alert("Please fill all teacher fields correctly (valid address, age >= 18)."); }
    };

    document.getElementById('addStudentBtn').onclick = async () => {
        const addr = document.getElementById('studentAddress').value.trim();
        const name = document.getElementById('studentName').value.trim();
        const age = document.getElementById('studentAge').value;
        const semester = document.getElementById('studentSemester').value;
        const email = document.getElementById('studentEmail').value.trim();
        const branch = document.getElementById('studentBranch').value.trim();
        const phone = document.getElementById('studentPhone').value.trim();

        if (addr && name && age && semester && email && branch && phone && web3.utils.isAddress(addr) && parseInt(age) >=18 && parseInt(semester) >=1) {
            try {
                await contract.methods.addStudent(name, age, semester, email, branch, phone, addr).send({ from: account });
                alert(`Student added successfully`);
                setupAdminUI(); 
            } catch (error) { alert("Error adding student: " + error.message); }
        } else { alert("Please fill all student fields correctly (valid address, age >= 5, semester >= 1)."); }
    };

    document.getElementById('assignBtn').onclick = async () => {
        const teacherId = assignTeacherSelect.value;
        const studentId = assignStudentSelect.value;
        if (teacherId && studentId) {
            try {
                await contract.methods.assignStudentToTeacher(studentId, teacherId).send({ from: account });
                alert("Student assigned successfully");
            } catch (error) { alert("Error assigning student: " + error.message); }
        } else { alert("Please select both teacher and student IDs."); }
    };

    document.getElementById('removeStudentBtn').onclick = async () => {
        const studentId = assignStudentSelect.value;
        if (studentId && confirm(`Are you sure you want to remove student with ID ${studentId}? This will delete all their data.`)) {
            try {
                await contract.methods.removeStudent(studentId).send({ from: account });
                alert("Student removed successfully");
                setupAdminUI();
            } catch (error) { alert("Error removing student: " + error.message); }
        }
    };

    document.getElementById('removeTeacherBtn').onclick = async () => {
        const teacherId = assignTeacherSelect.value;
        if (teacherId && confirm(`Are you sure you want to remove teacher with ID ${teacherId}? This will unassign them from all students.`)) {
            try {
                await contract.methods.removeTeacher(teacherId).send({ from: account });
                alert("Teacher removed successfully");
                setupAdminUI();
            } catch (error) { alert("Error removing teacher: " + error.message); }
        }
    };
}

// =================== Teacher UI ===================
async function setupTeacherUI() {
    const studentListUl = document.getElementById('studentList');
    studentListUl.innerHTML = '<li>Loading assigned students...</li>';
    try {
        const studentIds = await contract.methods.getMyStudents().call({ from: account });
        studentListUl.innerHTML = '';

        if (studentIds.length === 0) {
            studentListUl.innerHTML = '<li style="text-align: center; color: #64748b; padding: 20px;">No students assigned yet</li>';
            return;
        }

        for (const studentId of studentIds) {
            let studentNameDisplay = `Student ID: ${studentId}`;
            try {
                const studentInfo = await contract.methods.getStudentInfo(studentId).call({ from: account }); 
                if(studentInfo) {
                    studentNameDisplay = studentInfo.name;
                }
            } catch (e) {
                console.warn(`Teacher could not fetch details for student ${studentId}: ${e.message.split('\n')[0]}`);
            }

            const li = document.createElement('li');
            li.className = 'student-item';
            li.innerHTML = `
                <div>
                    <strong>${studentNameDisplay}</strong><br>
                </div>
                <div><button class="btn btn-sm btn-secondary" style="padding: 8px 12px;">Manage Courses</button></div>`;
            li.onclick = () => loadCoursesForStudentByTeacher(studentId, studentNameDisplay);
            studentListUl.appendChild(li);
        }
    } catch (error) {
        console.error('Teacher UI setup error (getMyStudents):', error);
        studentListUl.innerHTML = `<li>Error loading students: ${error.message}</li>`;
    }
}

async function loadCoursesForStudentByTeacher(studentId, studentName) {
    currentManagingStudentId = studentId;
    currentManagingStudentName = studentName;

    document.getElementById('courseSection').style.display = 'block';
    document.getElementById('selectedStudentNameAndId').innerText = `${studentName} (ID: ${studentId})`;

    const courseListElem = document.getElementById('courseList');
    courseListElem.innerHTML = '<li>Loading courses...</li>';

    try {
        const result = await contract.methods.getStudentCoursesAddedByMe(studentId).call({ from: account });
        const courseNames = result[0];
        const courses = result[1];
        courseListElem.innerHTML = '';

        if (courses.length === 0) {
            courseListElem.innerHTML = '<li style="text-align: center; color: #64748b; padding: 20px;">No courses added by you for this student yet.</li>';
        } else {
            courses.forEach((c, idx) => {
                const courseName = courseNames[idx]; 
                const li = document.createElement('li');
                li.className = 'course-item';
                li.innerHTML = `
                    <div><strong>${courseName}</strong></div>
                    <div class="course-details-grid">
                        <span>CIE1: ${formatScore(c.cie1)}</span>
                        <span>CIE2: ${formatScore(c.cie2)}</span>
                        <span>CIE3: ${formatScore(c.cie3)}</span>
                        <span>AAT: ${formatScore(c.aatScore)}</span>
                        <span>Lab: ${formatScore(c.labScore)}</span>
                        <span>Attend: ${formatScore(c.attendance)}%</span>
                    </div>
                    <div class="course-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editCourseByTeacher('${studentId}', '${courseName}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="removeCourseByTeacher('${studentId}', '${courseName}')">Remove</button>
                    </div>`;
                courseListElem.appendChild(li);
            });
        }

        document.getElementById('addCourseBtn').onclick = async () => {
            const name = document.getElementById('newCourseName').value.trim();
            if (!name) {
                alert("Course Name is compulsory.");
                return;
            }
            try {
                const cie1 = parseScoreInput(document.getElementById('newCIE1').value);
                const cie2 = parseScoreInput(document.getElementById('newCIE2').value);
                const cie3 = parseScoreInput(document.getElementById('newCIE3').value);
                const aat = parseScoreInput(document.getElementById('newAATScore').value);
                const lab = parseScoreInput(document.getElementById('newLabScore').value);
                const attendance = parseScoreInput(document.getElementById('newAttendance').value);

                await contract.methods.addCourseToStudent(studentId, name, cie1, cie2, cie3, aat, lab, attendance).send({ from: account });
                alert("Course added successfully!");
                ['newCourseName', 'newCIE1', 'newCIE2', 'newCIE3', 'newAATScore', 'newLabScore', 'newAttendance'].forEach(id => document.getElementById(id).value = '');
                loadCoursesForStudentByTeacher(studentId, studentName); 
            } catch (error) { 
                alert("Error adding course: " + error.message); 
            }
        };
    } catch (error) {
        console.error(`Error loading courses for student ${studentId}:`, error);
        courseListElem.innerHTML = `<li>Error loading courses: ${error.message}</li>`;
    }
}

window.editCourseByTeacher = async function(studentId, courseName) {
    let currentCourse;
    try {
        const result = await contract.methods.getStudentCoursesAddedByMe(studentId).call({ from: account });
        const courseNames = result[0];
        const courses = result[1];
        const courseIndex = courseNames.findIndex(name => name === courseName);
        if (courseIndex === -1) {
            alert("Course not found for editing.");
            return;
        }
        currentCourse = courses[courseIndex];
    } catch (e) {
        alert("Error fetching current course details: " + e.message);
        return;
    }
    
    try {
        const valCIE1 = prompt(`Enter new CIE1 score for ${courseName} (0-100 or blank, current: ${formatScore(currentCourse.cie1)}):`, currentCourse.cie1 == 200 ? "" : currentCourse.cie1);
        if (valCIE1 === null) { alert("Edit cancelled."); return; }
        const newCIE1 = valCIE1 === '' ? 200 : parseScoreInput(valCIE1);

        const valCIE2 = prompt(`Enter new CIE2 score (0-100 or blank, current: ${formatScore(currentCourse.cie2)}):`, currentCourse.cie2 == 200 ? "" : currentCourse.cie2);
        if (valCIE2 === null) { alert("Edit cancelled."); return; }
        const newCIE2 = valCIE2 === '' ? 200 : parseScoreInput(valCIE2);
        
        const valCIE3 = prompt(`Enter new CIE3 score (0-100 or blank, current: ${formatScore(currentCourse.cie3)}):`, currentCourse.cie3 == 200 ? "" : currentCourse.cie3);
        if (valCIE3 === null) { alert("Edit cancelled."); return; }
        const newCIE3 = valCIE3 === '' ? 200 : parseScoreInput(valCIE3);

        const valAAT = prompt(`Enter new AAT score (0-100 or blank, current: ${formatScore(currentCourse.aatScore)}):`, currentCourse.aatScore == 200 ? "" : currentCourse.aatScore);
        if (valAAT === null) { alert("Edit cancelled."); return; }
        const newAAT = valAAT === '' ? 200 : parseScoreInput(valAAT);

        const valLab = prompt(`Enter new Lab score (0-100 or blank, current: ${formatScore(currentCourse.labScore)}):`, currentCourse.labScore == 200 ? "" : currentCourse.labScore);
        if (valLab === null) { alert("Edit cancelled."); return; }
        const newLab = valLab === '' ? 200 : parseScoreInput(valLab);

        const valAttendance = prompt(`Enter new Attendance % (0-100 or blank, current: ${formatScore(currentCourse.attendance)}):`, currentCourse.attendance == 200 ? "" : currentCourse.attendance);
        if (valAttendance === null) { alert("Edit cancelled."); return; }
        const newAttendance = valAttendance === '' ? 200 : parseScoreInput(valAttendance);

        await contract.methods.updateCourse(studentId, courseName, newCIE1, newCIE2, newCIE3, newAAT, newLab, newAttendance).send({ from: account });
        alert("Course updated successfully!");
        loadCoursesForStudentByTeacher(currentManagingStudentId, currentManagingStudentName);
    } catch (error) {
        alert("Error updating course: " + error.message);
    }
};

window.removeCourseByTeacher = async function(studentId, courseName) {
    if (confirm(`Are you sure you want to remove course "${courseName}" for student ID ${studentId}?`)) {
        try {
            await contract.methods.removeCourse(studentId, courseName).send({ from: account });
            alert("Course removed successfully!");
            loadCoursesForStudentByTeacher(currentManagingStudentId, currentManagingStudentName);
        } catch (error) { alert("Error removing course: " + error.message); }
    }
};

// =================== Student UI ===================
async function setupStudentUI() {
    const detailsDiv = document.getElementById('studentDetails');
    detailsDiv.innerHTML = 'Loading your information...';
    try {
        const info = await contract.methods.getMyInfo().call({ from: account });
        detailsDiv.innerHTML = `
            <div class="info-item"><strong>Name:</strong> ${info.name}</div>
            <div class="info-item"><strong>Age:</strong> ${info.age}</div>
            <div class="info-item"><strong>Semester:</strong> ${info.semester}</div>
            <div class="info-item"><strong>Email:</strong> ${info.email}</div>
            <div class="info-item"><strong>Branch:</strong> ${info.branch}</div>
            <div class="info-item"><strong>Phone:</strong> ${info.phone}</div>
            <div class="info-item"><strong>Enrollment Date:</strong> ${new Date(Number(info.enrollmentDate) * 1000).toLocaleDateString()}</div>
            <div class="info-item"><strong>Wallet Address:</strong> <span class="address">${info.studentAddress}</span></div>
        `;
    } catch (error) {
        console.error('Student UI error (getMyInfo):', error);
        detailsDiv.innerHTML = `Error loading your information: ${error.message}`;
    }

    const courseListUl = document.getElementById('studentCourseList');
    courseListUl.innerHTML = '<li>Loading your courses...</li>';
    try {
        const result = await contract.methods.getMyCourses().call({ from: account });
        const courseNames = result[0];
        const courses = result[1];
        courseListUl.innerHTML = '';

        if (courses.length === 0) {
            courseListUl.innerHTML = '<li style="text-align: center; color: #64748b; padding: 20px;">No courses enrolled yet.</li>';
        } else {
            courses.forEach((c, idx) => {
                const li = document.createElement('li');
                li.className = 'course-item';
                li.innerHTML = `
                    <div><strong>${courseNames[idx]}</strong></div>
                    <div class="course-details-grid">
                        <span>CIE1: ${formatScore(c.cie1)}</span>
                        <span>CIE2: ${formatScore(c.cie2)}</span>
                        <span>CIE3: ${formatScore(c.cie3)}</span>
                        <span>AAT: ${formatScore(c.aatScore)}</span>
                        <span>Lab: ${formatScore(c.labScore)}</span>
                        <span>Attend: ${formatScore(c.attendance)}%</span>
                    </div>`;
                courseListUl.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Student UI error (getMyCourses):', error);
        courseListUl.innerHTML = `<li>Error loading your courses: ${error.message}</li>`;
    }
}
