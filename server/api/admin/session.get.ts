export default apiHandler(event => ({ authenticated: isAdmin(event) }))
