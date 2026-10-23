const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

async function request(path, token, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
  } catch {
    throw new Error(`Could not reach ${API_BASE}. Check the API server and CORS configuration.`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Admin API request failed (${response.status}).`);
  return body;
}

const pathId = (id) => encodeURIComponent(String(id));
const query = (values) => { const p = new URLSearchParams(); Object.entries(values || {}).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")p.set(k,String(v));}); const s=p.toString();return s?`?${s}`:""; };
const json = (method, body) => ({ method, body: JSON.stringify(body) });
const data = async (path, token, options) => (await request(path, token, options)).data;

export const adminLogin = (credentials) => request("/admin/login", "", json("POST", credentials));
export const getDashboard = (t) => data("/admin/dashboard",t);
export const getFlights = (t) => data("/admin/flights",t);
export const getFlight = (t,id) => data(`/admin/flights/${pathId(id)}`,t);
export const createFlight = (t,x) => data("/admin/flights",t,json("POST",x));
export const updateFlight = (t,id,x) => data(`/admin/flights/${pathId(id)}`,t,json("PUT",x));
export const cancelFlight = (t,id) => data(`/admin/flights/${pathId(id)}`,t,{method:"DELETE"});
export const getAirlines = (t) => data("/admin/airlines",t);
export const createAirline = (t,x) => data("/admin/airlines",t,json("POST",x));
export const updateAirline = (t,id,x) => data(`/admin/airlines/${pathId(id)}`,t,json("PUT",x));
export const deleteAirline = (t,id) => data(`/admin/airlines/${pathId(id)}`,t,{method:"DELETE"});
export const getAirports = (t) => data("/admin/airports",t);
export const createAirport = (t,x) => data("/admin/airports",t,json("POST",x));
export const updateAirport = (t,id,x) => data(`/admin/airports/${pathId(id)}`,t,json("PUT",x));
export const deleteAirport = (t,id) => data(`/admin/airports/${pathId(id)}`,t,{method:"DELETE"});
export const getHotels = (t,q) => data(`/admin/hotels${query(q)}`,t);
export const createHotel = (t,x) => data("/admin/hotels",t,json("POST",x));
export const updateHotel = (t,id,x) => data(`/admin/hotels/${pathId(id)}`,t,json("PUT",x));
export const deleteHotel = (t,id) => data(`/admin/hotels/${pathId(id)}`,t,{method:"DELETE"});
export const getRooms = (t,h) => data(`/admin/hotels/${pathId(h)}/rooms`,t);
export const createRoom = (t,h,x) => data(`/admin/hotels/${pathId(h)}/rooms`,t,json("POST",x));
export const updateRoom = (t,h,id,x) => data(`/admin/hotels/${pathId(h)}/rooms/${pathId(id)}`,t,json("PUT",x));
export const deleteRoom = (t,h,id) => data(`/admin/hotels/${pathId(h)}/rooms/${pathId(id)}`,t,{method:"DELETE"});
export const getBookings = (t,q) => data(`/admin/bookings${query(q)}`,t);
export const getBooking = (t,id) => data(`/admin/bookings/${pathId(id)}`,t);
export const updateBookingStatus = (t,id,status) => data(`/admin/bookings/${pathId(id)}/status`,t,json("PUT",{status}));
export const cancelBooking = (t,id) => data(`/admin/bookings/${pathId(id)}/cancel`,t,json("POST",{}));
export const getUsers = (t,q) => data(`/admin/users${query(q)}`,t);
export const updateUser = (t,id,x) => data(`/admin/users/${pathId(id)}`,t,json("PUT",x));
export const updateUserStatus = (t,id,status) => data(`/admin/users/${pathId(id)}/status`,t,json("PUT",{status}));
export const updateUserRole = (t,id,role) => data(`/admin/users/${pathId(id)}/role`,t,json("PUT",{role}));
export const getPayments = (t) => data("/admin/payments",t);
export const getFares = (t) => data("/admin/fares",t);
export const createFare = (t,x) => data("/admin/fares",t,json("POST",x));
export const updateFare = (t,id,x) => data(`/admin/fares/${pathId(id)}`,t,json("PUT",x));
export const deleteFare = (t,id) => data(`/admin/fares/${pathId(id)}`,t,{method:"DELETE"});
export const getAuditLogs = (t) => data("/admin/audit-logs",t);
export const getAdminProfile = (t) => data("/admin/settings/profile",t);
export const updateAdminProfile = (t,x) => data("/admin/settings/profile",t,json("PUT",x));
export const changeAdminPassword = (t,x) => data("/admin/settings/password",t,json("PUT",x));
export const adminLogout = (t) => data("/admin/logout",t,json("POST",{}));
