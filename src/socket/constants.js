const listenEvents = {
	// Connection & Authentication
	OnConnection: 'connection',
	OnDisconnect: 'disconnect',

	// Group
	CreateGroup: 'CreateGroup',
	EditGroup: 'EditGroup',
	DeleteGroup: 'DeleteGroup',
	AddMember: 'AddMember',
	RemoveMember: 'RemoveMember',
	GetGroupByUser: 'GetGroupByUser',
	GetGroupOfUser: 'GetGroupOfUser',
	SendMessage: 'SendEmployeeMessage',

	// Update User
	UpdateUser: 'UpdateUser',

	// Server Notifications
	// CheckIfSynced: "CheckIfSynced",
};

const emitEvents = {
	// Connection & Authentication
	connected: 'connected',
	disconnected: 'disconnected',

	// Group
	GroupCreated: 'GroupCreated',
	OnGroupUpdate: 'OnGroupUpdate',
	OnMessage: 'OnMessage',

	// Server Notifications
	// OnSyncChanges: "OnSyncChanges"

	// YB Manager
	OnYBManagerUpdate: 'OnYBManagerUpdate',
	NewTransaction: 'NewTransaction',

	SendMessage: 'SendEmployeeMessage',
};

const broadcastRooms = {
	YBManager: 'YBManager',
	NewTransaction: 'NewTransaction_',
};

module.exports = {
	listenEvents,
	emitEvents,
	broadcastRooms,
};
