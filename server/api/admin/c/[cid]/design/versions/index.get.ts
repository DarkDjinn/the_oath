import { listDesignVersions } from '../../../../../../core/campaigns'

/** A campaign's earlier designs, newest first, so a change can be taken back. */
export default apiHandler(event => listDesignVersions(useDb(), requireCampaign(event).id))
