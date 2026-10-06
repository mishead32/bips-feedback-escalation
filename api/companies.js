// GET /api/companies – list for the login screen (no secrets)
import { companyList } from '../lib/config.js';
import { json, wrap } from '../lib/http.js';
export default wrap(async (req, res) => json(res, 200, { companies: companyList() }), { all: true });
