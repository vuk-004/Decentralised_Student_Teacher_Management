var StudentTeacherManagement = artifacts.require("StudentTeacherManagement");

module.exports = function(deployer) {
  deployer.deploy(StudentTeacherManagement);
};