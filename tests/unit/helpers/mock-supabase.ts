export interface RecordedSupabaseCall {
  kind: 'from' | 'rpc' | 'storage' | 'auth.admin.listUsers'
  target: string
  operation?: string
  payload?: unknown
  filters?: Array<{ method: string; args: unknown[] }>
}

export interface TableResponderConfig {
  select?: { data?: unknown; error?: unknown; count?: number | null }
  insert?: { data?: unknown; error?: unknown }
  update?: { data?: unknown; error?: unknown }
  delete?: { data?: unknown; error?: unknown }
  upsert?: { data?: unknown; error?: unknown }
}

export function createMockSupabase(options?: {
  tables?: Record<string, TableResponderConfig | ((call: RecordedSupabaseCall) => { data?: unknown; error?: unknown; count?: number | null })>
  rpcs?: Record<string, { data?: unknown; error?: unknown } | ((params: unknown) => { data?: unknown; error?: unknown })>
  storage?: {
    createSignedUploadUrl?: { data?: { signedUrl: string; path: string; token: string } | null; error?: unknown }
    createSignedUrl?: { data?: { signedUrl: string } | null; error?: unknown }
    upload?: { data?: { path: string } | null; error?: unknown }
    remove?: { data?: unknown; error?: unknown }
    download?: { data?: Blob | null; error?: unknown }
    publicUrl?: string
  }
  authUsers?: Array<{ id: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string }>
}) {
  const calls: RecordedSupabaseCall[] = []
  const tables = options?.tables ?? {}
  const rpcs = options?.rpcs ?? {}
  const storageConfig = options?.storage ?? {}

  function createQueryBuilder(tableName: string) {
    let operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
    let payload: unknown = undefined
    const filters: Array<{ method: string; args: unknown[] }> = []

    const resolveResult = () => {
      const callRecord: RecordedSupabaseCall = {
        kind: 'from',
        target: tableName,
        operation,
        payload,
        filters: [...filters],
      }
      calls.push(callRecord)

      const handler = tables[tableName]
      if (!handler) {
        return { data: operation === 'select' ? [] : null, error: null, count: 0 }
      }
      if (typeof handler === 'function') {
        const res = handler(callRecord)
        return { data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }
      }
      const opResult = handler[operation] ?? handler.select ?? { data: null, error: null }
      return {
        data: opResult.data ?? null,
        error: opResult.error ?? null,
        count: 'count' in opResult ? (opResult.count ?? null) : null,
      }
    }

    const builder: Record<string, unknown> = {
      select: (...args: unknown[]) => {
        if (operation === 'select') {
          filters.push({ method: 'select', args })
        }
        return builder
      },
      insert: (data: unknown) => {
        operation = 'insert'
        payload = data
        return builder
      },
      update: (data: unknown) => {
        operation = 'update'
        payload = data
        return builder
      },
      delete: () => {
        operation = 'delete'
        return builder
      },
      upsert: (data: unknown, opts?: unknown) => {
        operation = 'upsert'
        payload = { data, opts }
        return builder
      },
      eq: (...args: unknown[]) => {
        filters.push({ method: 'eq', args })
        return builder
      },
      neq: (...args: unknown[]) => {
        filters.push({ method: 'neq', args })
        return builder
      },
      in: (...args: unknown[]) => {
        filters.push({ method: 'in', args })
        return builder
      },
      is: (...args: unknown[]) => {
        filters.push({ method: 'is', args })
        return builder
      },
      not: (...args: unknown[]) => {
        filters.push({ method: 'not', args })
        return builder
      },
      gt: (...args: unknown[]) => {
        filters.push({ method: 'gt', args })
        return builder
      },
      gte: (...args: unknown[]) => {
        filters.push({ method: 'gte', args })
        return builder
      },
      lt: (...args: unknown[]) => {
        filters.push({ method: 'lt', args })
        return builder
      },
      lte: (...args: unknown[]) => {
        filters.push({ method: 'lte', args })
        return builder
      },
      or: (...args: unknown[]) => {
        filters.push({ method: 'or', args })
        return builder
      },
      overlaps: (...args: unknown[]) => {
        filters.push({ method: 'overlaps', args })
        return builder
      },
      textSearch: (...args: unknown[]) => {
        filters.push({ method: 'textSearch', args })
        return builder
      },
      order: (...args: unknown[]) => {
        filters.push({ method: 'order', args })
        return builder
      },
      limit: (...args: unknown[]) => {
        filters.push({ method: 'limit', args })
        return builder
      },
      single: () => {
        filters.push({ method: 'single', args: [] })
        const res = resolveResult()
        if (Array.isArray(res.data)) {
          return Promise.resolve({ data: res.data[0] ?? null, error: res.error })
        }
        return Promise.resolve(res)
      },
      maybeSingle: () => {
        filters.push({ method: 'maybeSingle', args: [] })
        const res = resolveResult()
        if (Array.isArray(res.data)) {
          return Promise.resolve({ data: res.data[0] ?? null, error: res.error })
        }
        return Promise.resolve(res)
      },
      then: (onfulfilled?: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) => {
        return Promise.resolve(resolveResult()).then(onfulfilled, onrejected)
      },
    }

    return builder
  }

  const client = {
    calls,
    from: (tableName: string) => createQueryBuilder(tableName),
    rpc: async (fnName: string, params?: unknown) => {
      calls.push({ kind: 'rpc', target: fnName, payload: params })
      const handler = rpcs[fnName]
      if (!handler) return { data: null, error: null }
      if (typeof handler === 'function') {
        const res = handler(params)
        return { data: res.data ?? null, error: res.error ?? null }
      }
      return { data: handler.data ?? null, error: handler.error ?? null }
    },
    storage: {
      from: (bucketName: string) => ({
        createSignedUploadUrl: async (filePath: string) => {
          calls.push({ kind: 'storage', target: bucketName, operation: 'createSignedUploadUrl', payload: filePath })
          if (storageConfig.createSignedUploadUrl) {
            return {
              data: storageConfig.createSignedUploadUrl.data ?? null,
              error: storageConfig.createSignedUploadUrl.error ?? null,
            }
          }
          return {
            data: {
              signedUrl: `https://storage.example.test/upload/${bucketName}/${filePath}?token=tok_123`,
              path: filePath,
              token: 'tok_123',
            },
            error: null,
          }
        },
        createSignedUrl: async (filePath: string, expiresIn: number) => {
          calls.push({ kind: 'storage', target: bucketName, operation: 'createSignedUrl', payload: { filePath, expiresIn } })
          if (storageConfig.createSignedUrl) {
            return {
              data: storageConfig.createSignedUrl.data ?? null,
              error: storageConfig.createSignedUrl.error ?? null,
            }
          }
          return {
            data: { signedUrl: `https://storage.example.test/sign/${bucketName}/${filePath}?exp=${expiresIn}` },
            error: null,
          }
        },
        upload: async (filePath: string, file: unknown, opts?: unknown) => {
          calls.push({ kind: 'storage', target: bucketName, operation: 'upload', payload: { filePath, file, opts } })
          if (storageConfig.upload) {
            return {
              data: storageConfig.upload.data ?? null,
              error: storageConfig.upload.error ?? null,
            }
          }
          return { data: { path: filePath }, error: null }
        },
        remove: async (paths: string[]) => {
          calls.push({ kind: 'storage', target: bucketName, operation: 'remove', payload: paths })
          if (storageConfig.remove) {
            return {
              data: storageConfig.remove.data ?? null,
              error: storageConfig.remove.error ?? null,
            }
          }
          return { data: paths, error: null }
        },
        download: async (filePath: string) => {
          calls.push({ kind: 'storage', target: bucketName, operation: 'download', payload: filePath })
          if (storageConfig.download) {
            return {
              data: storageConfig.download.data ?? null,
              error: storageConfig.download.error ?? null,
            }
          }
          return { data: new Blob(['Beispieltext mit mindestens zehn Wörtern für unseren Aufsatz Korrektur Testlauf heute.']), error: null }
        },
        getPublicUrl: (filePath: string) => ({
          data: {
            publicUrl: storageConfig.publicUrl ?? `https://storage.example.test/public/${bucketName}/${filePath}`,
          },
        }),
      }),
    },
    auth: {
      admin: {
        listUsers: async () => {
          calls.push({ kind: 'auth.admin.listUsers', target: 'auth.users' })
          return {
            data: { users: options?.authUsers ?? [] },
            error: null,
          }
        },
      },
    },
  }

  return client
}
