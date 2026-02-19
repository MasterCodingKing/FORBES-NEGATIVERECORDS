const { sequelize } = require("../config/database");

const Role = require("./role.model");
const User = require("./user.model");
const Client = require("./client.model");
const SubDomain = require("./sub_domain.model");
const AuditLog = require("./audit_log.model");
const NegativeRecord = require("./negative_record.model");
const OcrBatch = require("./ocr_batch.model");
const SearchLog = require("./search_log.model");
const UnlockRequest = require("./unlock_request.model");
const News = require("./news.model");
const CreditTransaction = require("./credit_transaction.model");

const initModels = () => {
  Role.initModel(sequelize);
  User.initModel(sequelize);
  Client.initModel(sequelize);
  SubDomain.initModel(sequelize);
  AuditLog.initModel(sequelize);
  NegativeRecord.initModel(sequelize);
  OcrBatch.initModel(sequelize);
  SearchLog.initModel(sequelize);
  UnlockRequest.initModel(sequelize);
  News.initModel(sequelize);
  CreditTransaction.initModel(sequelize);

  // Role <-> User
  Role.hasMany(User, { foreignKey: "roleId" });
  User.belongsTo(Role, { foreignKey: "roleId" });

  // Client <-> User
  Client.hasMany(User, { foreignKey: "clientId" });
  User.belongsTo(Client, { foreignKey: "clientId" });

  // User <-> SubDomain (branch assignment)
  SubDomain.hasMany(User, { foreignKey: "branchId" });
  User.belongsTo(SubDomain, { foreignKey: "branchId", as: "Branch" });

  // Client <-> SubDomain (branches)
  Client.hasMany(SubDomain, { foreignKey: "clientId" });
  SubDomain.belongsTo(Client, { foreignKey: "clientId" });

  // User <-> AuditLog
  User.hasMany(AuditLog, { foreignKey: "userId" });
  AuditLog.belongsTo(User, { foreignKey: "userId" });

  // OcrBatch <-> NegativeRecord
  OcrBatch.hasMany(NegativeRecord, { foreignKey: "ocrBatchId" });
  NegativeRecord.belongsTo(OcrBatch, { foreignKey: "ocrBatchId" });

  // User <-> OcrBatch
  User.hasMany(OcrBatch, { foreignKey: "uploadedBy" });
  OcrBatch.belongsTo(User, { foreignKey: "uploadedBy" });

  // User <-> SearchLog
  User.hasMany(SearchLog, { foreignKey: "userId" });
  SearchLog.belongsTo(User, { foreignKey: "userId" });

  // Client <-> SearchLog
  Client.hasMany(SearchLog, { foreignKey: "clientId" });
  SearchLog.belongsTo(Client, { foreignKey: "clientId" });

  // UnlockRequest associations
  User.hasMany(UnlockRequest, { foreignKey: "requestedBy", as: "UnlockRequests" });
  UnlockRequest.belongsTo(User, { foreignKey: "requestedBy", as: "Requester" });
  NegativeRecord.hasMany(UnlockRequest, { foreignKey: "recordId" });
  UnlockRequest.belongsTo(NegativeRecord, { foreignKey: "recordId" });

  // News
  User.hasMany(News, { foreignKey: "createdBy" });
  News.belongsTo(User, { foreignKey: "createdBy" });

  // CreditTransaction
  Client.hasMany(CreditTransaction, { foreignKey: "clientId" });
  CreditTransaction.belongsTo(Client, { foreignKey: "clientId" });
  User.hasMany(CreditTransaction, { foreignKey: "performedBy" });
  CreditTransaction.belongsTo(User, { foreignKey: "performedBy" });
};

module.exports = {
  initModels,
  Role,
  User,
  Client,
  SubDomain,
  AuditLog,
  NegativeRecord,
  OcrBatch,
  SearchLog,
  UnlockRequest,
  News,
  CreditTransaction
};
