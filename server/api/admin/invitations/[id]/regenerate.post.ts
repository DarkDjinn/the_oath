import { regenerateToken } from '../../../../core/invitations'

export default apiHandler(event => adminView(event, regenerateToken(useDb(), tokenSecret(), invitationId(event))))
