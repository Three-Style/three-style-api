const adminBasePath = '/admin/v1';
const httpMethods = {
	GET: 'GET',
	POST: 'POST',
	PUT: 'PUT',
	DELETE: 'DELETE',
};

const adminRoutes = [
	{
		path: adminBasePath + '/dashboard/get-dashboard',
		method: httpMethods.GET,
	},
];

const usersRoutes = [];

exports.oAuthRoutes = [...adminRoutes, ...usersRoutes];
exports.adminBasePath = adminBasePath;
