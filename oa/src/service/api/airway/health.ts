import { request } from '@/service/request';

export function fetchAirwayRoot() {
  return request.get('/');
}

export function fetchAirwayHealth() {
  return request.get('/api/health');
}
