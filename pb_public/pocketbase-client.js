/**
 * Minimal PocketBase Client Implementation
 * This is a simplified version that works without CDN dependencies
 */

class PocketBase {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.authStore = {
            token: localStorage.getItem('pb_auth_token') || '',
            model: JSON.parse(localStorage.getItem('pb_auth_model') || 'null'),
            isValid: false,
            onChange: () => {},
            clear: () => {
                this.authStore.token = '';
                this.authStore.model = null;
                this.authStore.isValid = false;
                localStorage.removeItem('pb_auth_token');
                localStorage.removeItem('pb_auth_model');
                this.authStore.onChange(this.authStore.token, this.authStore.model);
            },
            save: (token, model) => {
                this.authStore.token = token;
                this.authStore.model = model;
                this.authStore.isValid = !!token;
                localStorage.setItem('pb_auth_token', token);
                localStorage.setItem('pb_auth_model', JSON.stringify(model));
                this.authStore.onChange(token, model);
            }
        };
        
        // Check if token is valid
        if (this.authStore.token && this.authStore.model) {
            this.authStore.isValid = true;
        }
        
        this.subscriptions = {};
    }

    async _send(path, options = {}) {
        const url = this.baseUrl + path;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.authStore.token) {
            headers['Authorization'] = this.authStore.token;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || 'Request failed');
        }

        return await response.json();
    }

    collection(name) {
        return {
            getFullList: async (options = {}) => {
                let query = '?perPage=500';
                if (options.sort) query += `&sort=${options.sort}`;
                if (options.filter) query += `&filter=${encodeURIComponent(options.filter)}`;
                if (options.expand) query += `&expand=${options.expand}`;
                
                const result = await this._send(`/api/collections/${name}/records${query}`);
                return result.items || [];
            },

            getList: async (page = 1, perPage = 30, options = {}) => {
                let query = `?page=${page}&perPage=${perPage}`;
                if (options.sort) query += `&sort=${options.sort}`;
                if (options.filter) query += `&filter=${encodeURIComponent(options.filter)}`;
                if (options.expand) query += `&expand=${options.expand}`;
                
                return await this._send(`/api/collections/${name}/records${query}`);
            },

            getOne: async (id, options = {}) => {
                let query = '';
                if (options.expand) query = `?expand=${options.expand}`;
                return await this._send(`/api/collections/${name}/records/${id}${query}`);
            },

            create: async (data) => {
                return await this._send(`/api/collections/${name}/records`, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            },

            update: async (id, data) => {
                return await this._send(`/api/collections/${name}/records/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(data)
                });
            },

            delete: async (id) => {
                return await this._send(`/api/collections/${name}/records/${id}`, {
                    method: 'DELETE'
                });
            },

            authWithPassword: async (identity, password) => {
                const result = await this._send(`/api/collections/${name}/auth-with-password`, {
                    method: 'POST',
                    body: JSON.stringify({ identity, password })
                });
                
                if (result.token && result.record) {
                    this.authStore.save(result.token, result.record);
                }
                
                return result;
            },

            subscribe: (idOrFilter, callback, options = {}) => {
                // For this simplified version, we'll use polling instead of WebSockets
                const subscriptionId = Math.random().toString(36);
                let lastCheck = Date.now();
                let isWildcard = idOrFilter === '*';
                
                const poll = async () => {
                    try {
                        let records;
                        if (isWildcard) {
                            const result = await this.collection(name).getList(1, 100, {
                                sort: '-created',
                                filter: options.filter
                            });
                            records = result.items;
                        } else {
                            const record = await this.collection(name).getOne(idOrFilter);
                            records = [record];
                        }
                        
                        records.forEach(record => {
                            const recordTime = new Date(record.updated || record.created).getTime();
                            if (recordTime > lastCheck) {
                                callback({
                                    action: 'create',
                                    record: record
                                });
                            }
                        });
                        
                        lastCheck = Date.now();
                    } catch (error) {
                        console.error('Subscription poll error:', error);
                    }
                    
                    if (this.subscriptions[subscriptionId]) {
                        setTimeout(poll, 1000); // Poll every second
                    }
                };
                
                this.subscriptions[subscriptionId] = { name, callback, poll };
                poll();
                
                // Return unsubscribe function
                return () => {
                    delete this.subscriptions[subscriptionId];
                };
            },

            unsubscribe: (id) => {
                if (id) {
                    delete this.subscriptions[id];
                } else {
                    // Unsubscribe all for this collection
                    Object.keys(this.subscriptions).forEach(key => {
                        if (this.subscriptions[key].name === name) {
                            delete this.subscriptions[key];
                        }
                    });
                }
            }
        };
    }
}
