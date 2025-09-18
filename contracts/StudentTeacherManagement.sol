// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StudentTeacherManagement {
    
    struct Course {
        string courseName;
        uint cie1;         
        uint cie2;         
        uint cie3;         
        uint aatScore;      
        uint labScore;     
        uint attendance;   
        uint teacherId;    
        bool exists;        
    }
    
    struct Student {
        string name;
        uint age;
        uint semester;
        string email;
        string branch;
        string phone;
        uint enrollmentDate;
        address studentAddress; 
        bool exists;
        string[] courseNames; 
    }
    
    struct Teacher {
        string name;
        uint age;
        address teacherAddress; 
        bool exists;
    }
    
    mapping(uint => Student) private students;
    mapping(uint => Teacher) private teachers;
    mapping(uint => mapping(string => Course)) private studentCourses; 
    mapping(address => uint) private studentAddressMap; 
    mapping(address => uint) private teacherAddressMap;  
    mapping(uint => uint[]) private teacherStudentMap;   
    mapping(uint => mapping(uint => bool)) private teacherToStudent; 
    uint[] private allStudentIds;
    uint[] private allTeacherIds;
    
    address public admin;
    uint private nextStudentId = 1;
    uint private nextTeacherId = 1;
    
    
    constructor() {
        admin = msg.sender;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyTeacher() {
        require(teacherAddressMap[msg.sender] != 0, "Only teachers can perform this action");
        _;
    }
    
    modifier onlyStudent() {
        require(studentAddressMap[msg.sender] != 0, "Only students can perform this action");
        _;
    }
    
    modifier onlyExistingStudent(uint studentId) {
        require(students[studentId].exists, "Student does not exist");
        _;
    }
    
    modifier onlyExistingTeacher(uint teacherId) {
        require(teachers[teacherId].exists, "Teacher does not exist");
        _;
    }
    
    modifier onlyAssignedTeacher(uint studentId) {
        uint teacherId = teacherAddressMap[msg.sender];
        require(teacherToStudent[teacherId][studentId], "Student not assigned to this teacher");
        _;
    }
    
    // Admin Functions
    function addStudent(
        string memory name,
        uint age,
        uint semester,
        string memory email,
        string memory branch,
        string memory phone,
        address studentAddress
    ) public onlyAdmin returns (uint) {
        require(studentAddressMap[studentAddress] == 0, "Address already assigned to a student");
        
        uint studentId = nextStudentId++;
        students[studentId] = Student({
            name: name,
            age: age,
            semester: semester,
            email: email,
            branch: branch,
            phone: phone,
            enrollmentDate: block.timestamp,
            studentAddress: studentAddress,
            exists: true,
            courseNames: new string[](0)
        });
        
        studentAddressMap[studentAddress] = studentId;
        allStudentIds.push(studentId);
        return studentId;
    }
    
    function addTeacher(
        string memory name,
        uint age,
        address teacherAddress
    ) public onlyAdmin returns (uint) {
        require(teacherAddressMap[teacherAddress] == 0, "Address already assigned to a teacher");
        
        uint teacherId = nextTeacherId++;
        teachers[teacherId] = Teacher({
            name: name,
            age: age,
            teacherAddress: teacherAddress,
            exists: true
        });
        teacherAddressMap[teacherAddress] = teacherId;
        allTeacherIds.push(teacherId);
        return teacherId;
    }
    
    function assignStudentToTeacher(uint studentId, uint teacherId) 
        public 
        onlyAdmin 
        onlyExistingStudent(studentId) 
        onlyExistingTeacher(teacherId) 
    {
        require(!teacherToStudent[teacherId][studentId], "Student already assigned to this teacher");
        
        teacherToStudent[teacherId][studentId] = true;
        teacherStudentMap[teacherId].push(studentId);
        
    }
    
    function removeStudentFromTeacher(uint studentId, uint teacherId) 
        public 
        onlyAdmin 
        onlyExistingStudent(studentId) 
        onlyExistingTeacher(teacherId) 
    {
        require(teacherToStudent[teacherId][studentId], "Student not assigned to this teacher");
        
        teacherToStudent[teacherId][studentId] = false;
        
        uint[] storage assignedStudents = teacherStudentMap[teacherId];
        for (uint i = 0; i < assignedStudents.length; i++) {
            if (assignedStudents[i] == studentId) {
                assignedStudents[i] = assignedStudents[assignedStudents.length - 1];
                assignedStudents.pop();
                break;
            }
        }
    }

    function getAllStudentCourses(uint studentId) 
        public 
        view 
        onlyAdmin 
        onlyExistingStudent(studentId) 
        returns (string[] memory, Course[] memory) 
    {
        string[] memory courseNames = students[studentId].courseNames;
        Course[] memory courses = new Course[](courseNames.length);
        
        for (uint i = 0; i < courseNames.length; i++) {
            courses[i] = studentCourses[studentId][courseNames[i]];
        }
        
        return (courseNames, courses);
    }

    function getTeacherInfo(uint teacherId) 
        public 
        view 
        onlyAdmin 
        onlyExistingTeacher(teacherId) 
        returns (string memory name, uint age, address teacherAddress, uint[] memory assignedStudents) 
    {
        Teacher memory teacher = teachers[teacherId];
        return (teacher.name, teacher.age, teacher.teacherAddress, teacherStudentMap[teacherId]);
    }

    function getStudentInfo(uint studentId) 
        public 
        view 
        onlyAdmin()
        onlyExistingStudent(studentId) 
        returns (
            string memory name,
            uint age,
            uint semester,
            string memory email,
            string memory branch,
            string memory phone,
            uint enrollmentDate,
            address studentAddress
        ) 
    {
        Student memory student = students[studentId];
        return (
            student.name,
            student.age,
            student.semester,
            student.email,
            student.branch,
            student.phone,
            student.enrollmentDate,
            student.studentAddress
        );
    }


    function getStudentAddress(uint studentId) public view onlyAdmin onlyExistingStudent(studentId) returns (address) {
        return students[studentId].studentAddress;
    }
    
    function getTeacherAddress(uint teacherId) public view onlyAdmin onlyExistingTeacher(teacherId) returns (address) {
        return teachers[teacherId].teacherAddress;
    }

    
    function getAllStudentIds() public view onlyAdmin returns (uint[] memory) {
        return allStudentIds;
    }

    function getAllTeacherIds() public view onlyAdmin returns (uint[] memory) {
        return allTeacherIds;
    }
    
    function removeStudent(uint studentId) public onlyAdmin onlyExistingStudent(studentId) {
    string[] storage courseNames = students[studentId].courseNames;
    for (uint i = 0; i < courseNames.length; i++) {
        delete studentCourses[studentId][courseNames[i]];
    }

    for (uint i = 0; i < allTeacherIds.length; i++) {
        uint t = allTeacherIds[i];
        if (teacherToStudent[t][studentId]) {
            teacherToStudent[t][studentId] = false;
            uint[] storage assigned = teacherStudentMap[t];
            for (uint j = 0; j < assigned.length; j++) {
                if (assigned[j] == studentId) {
                    assigned[j] = assigned[assigned.length - 1];
                    assigned.pop();
                    break;
                }
            }
        }
    }

    delete studentAddressMap[students[studentId].studentAddress];
    delete students[studentId];

    for (uint i = 0; i < allStudentIds.length; i++) {
        if (allStudentIds[i] == studentId) {
            allStudentIds[i] = allStudentIds[allStudentIds.length - 1];
            allStudentIds.pop();
            break;
        }
    }
 }

    function removeTeacher(uint teacherId) public onlyAdmin onlyExistingTeacher(teacherId) {
        uint[] storage assignedStudents = teacherStudentMap[teacherId];
        for (uint i = 0; i < assignedStudents.length; i++) {
            uint studentId = assignedStudents[i];
            teacherToStudent[teacherId][studentId] = false;
        }
        delete teacherStudentMap[teacherId];

        delete teacherAddressMap[teachers[teacherId].teacherAddress];
        delete teachers[teacherId];

        for (uint i = 0; i < allTeacherIds.length; i++) {
            if (allTeacherIds[i] == teacherId) {
                allTeacherIds[i] = allTeacherIds[allTeacherIds.length - 1];
                allTeacherIds.pop();
                break;
            }
        }
    }

    function getTeachersForStudent(uint studentId) 
        public 
        view 
        onlyAdmin 
        onlyExistingStudent(studentId) 
        returns (uint[] memory) 
    {
        uint count = 0;
        for (uint i = 0; i < allTeacherIds.length; i++) {
            uint teacherId = allTeacherIds[i];
            if (teacherToStudent[teacherId][studentId]) {
                count++;
            }
        }

        uint[] memory assignedTeachers = new uint[](count);
        uint index = 0;
        for (uint i = 0; i < allTeacherIds.length; i++) {
            uint teacherId = allTeacherIds[i];
            if (teacherToStudent[teacherId][studentId]) {
                assignedTeachers[index] = teacherId;
                index++;
            }
        }
        return assignedTeachers;
    }
   
   function isStudentAssignedToTeacher (uint studentId, uint teacherId) public view onlyAdmin returns (bool) {
        require(students[studentId].exists, "Student doesn't exist");
        require(teachers[teacherId].exists, "Teacher doesn't exist");
        return teacherToStudent[teacherId][studentId];
    }

    //Teacher function
    
    function addCourseToStudent(
        uint studentId,
        string memory courseName,
        uint cie1,
        uint cie2,
        uint cie3,
        uint aatScore,
        uint labScore,
        uint attendance
    ) public onlyTeacher onlyExistingStudent(studentId) onlyAssignedTeacher(studentId) {
        require(!studentCourses[studentId][courseName].exists, "Course already exists for this student");
        
        uint teacherId = teacherAddressMap[msg.sender];
        
        studentCourses[studentId][courseName] = Course({
            courseName: courseName,
            cie1: cie1,
            cie2: cie2,
            cie3: cie3,
            aatScore: aatScore,
            labScore: labScore,
            attendance: attendance,
            teacherId: teacherId,
            exists: true
        });
        
        students[studentId].courseNames.push(courseName);
    }
    
    function updateCourse(
        uint studentId,
        string memory courseName,
        uint cie1,
        uint cie2,
        uint cie3,
        uint aatScore,
        uint labScore,
        uint attendance
    ) public onlyTeacher onlyExistingStudent(studentId) onlyAssignedTeacher(studentId) {
        require(studentCourses[studentId][courseName].exists, "Course does not exist");
        
        uint teacherId = teacherAddressMap[msg.sender];
        require(studentCourses[studentId][courseName].teacherId == teacherId, "You can only modify courses you added");
        
        Course storage course = studentCourses[studentId][courseName];
        course.cie1 = cie1;
        course.cie2 = cie2;
        course.cie3 = cie3;
        course.aatScore = aatScore;
        course.labScore = labScore;
        course.attendance = attendance;
        
    }
    
    function removeCourse(uint studentId, string memory courseName) 
        public 
        onlyTeacher 
        onlyExistingStudent(studentId) 
        onlyAssignedTeacher(studentId) 
    {
        require(studentCourses[studentId][courseName].exists, "Course does not exist");
        
        uint teacherId = teacherAddressMap[msg.sender];
        require(studentCourses[studentId][courseName].teacherId == teacherId, "You can only remove courses you added");
        
        delete studentCourses[studentId][courseName];
        
        string[] storage courseNames = students[studentId].courseNames;
        for (uint i = 0; i < courseNames.length; i++) {
            if (keccak256(bytes(courseNames[i])) == keccak256(bytes(courseName))) {
                courseNames[i] = courseNames[courseNames.length - 1];
                courseNames.pop();
                break;
            }
        }
    }
    
    function getMyStudents() public view onlyTeacher returns (uint[] memory) {
        uint teacherId = teacherAddressMap[msg.sender];
        return teacherStudentMap[teacherId];
    }
    
    function getStudentCoursesAddedByMe(uint studentId) 
        public 
        view 
        onlyTeacher 
        onlyExistingStudent(studentId) 
        onlyAssignedTeacher(studentId) 
        returns (string[] memory, Course[] memory) 
    {
        uint teacherId = teacherAddressMap[msg.sender];
        string[] memory allCourseNames = students[studentId].courseNames;
        
        uint count = 0;
        for (uint i = 0; i < allCourseNames.length; i++) {
            if (studentCourses[studentId][allCourseNames[i]].teacherId == teacherId) {
                count++;
            }
        }
        
        string[] memory myCourseNames = new string[](count);
        Course[] memory myCourses = new Course[](count);
        
        uint index = 0;
        for (uint i = 0; i < allCourseNames.length; i++) {
            if (studentCourses[studentId][allCourseNames[i]].teacherId == teacherId) {
                myCourseNames[index] = allCourseNames[i];
                myCourses[index] = studentCourses[studentId][allCourseNames[i]];
                index++;
            }
        }
        
        return (myCourseNames, myCourses);
    }

    function getTeacherInfo()
    public
    view
    onlyTeacher
    returns (
        string memory name,
        uint age,
        address teacherAddress,
        uint[] memory assignedStudents
    )
{
    uint teacherId = teacherAddressMap[msg.sender];
    require(teachers[teacherId].exists, "Teacher not found");

    Teacher memory teacher = teachers[teacherId];

    return (
        teacher.name,
        teacher.age,
        teacher.teacherAddress,
        teacherStudentMap[teacherId]
    );
}

    //Student
    function getMyInfo() public view onlyStudent returns (
        string memory name,
        uint age,
        uint semester,
        string memory email,
        string memory branch,
        string memory phone,
        uint enrollmentDate,
        address studentAddress
    ) {
        uint studentId = studentAddressMap[msg.sender];
        Student memory student = students[studentId];
        return (
            student.name,
            student.age,
            student.semester,
            student.email,
            student.branch,
            student.phone,
            student.enrollmentDate,
            student.studentAddress
        );
    }
    
    function getMyCourses() public view onlyStudent returns (string[] memory, Course[] memory) {
        uint studentId = studentAddressMap[msg.sender];
        string[] memory courseNames = students[studentId].courseNames;
        Course[] memory courses = new Course[](courseNames.length);
        
        for (uint i = 0; i < courseNames.length; i++) {
            courses[i] = studentCourses[studentId][courseNames[i]];
        }
        
        return (courseNames, courses);
    }
    
    //helper

    function getMyRole() public view returns (string memory) {
        if (msg.sender == admin) {
            return "Admin";
        } else if (teacherAddressMap[msg.sender] != 0) {
            return "Teacher";
        } else if (studentAddressMap[msg.sender] != 0) {
            return "Student";
        } else {
            return "Unregistered";
        }
    }
    
    function getMyId() public view returns (uint) {
        if (teacherAddressMap[msg.sender] != 0) {
            return teacherAddressMap[msg.sender];
        } else if (studentAddressMap[msg.sender] != 0) {
            return studentAddressMap[msg.sender];
        } else {
            revert("You are not registered in the system");
        }
    }
}