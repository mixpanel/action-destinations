import dns from 'dns'
import { NormalizedOptions } from 'got'
import ip from 'ip'
import net from 'net'

/**
 * @see {@link https://segment.atlassian.net/browse/SECOPS-1684}
 * @see {@link https://github.com/segmentio/netsec/blob/60ebb15632410bad598ab46142177007fc7e2793/netsec.go#L36-L46}
 */
const RESTRICTED_CIDR_BLOCKS = [
  '0.0.0.0/32',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  'fc00::/7',
  'fd00::/8',
  'fe80::/10',
  '::1/128'
]

const CIDR_SUBNETS = RESTRICTED_CIDR_BLOCKS.map(block => ip.cidrSubnet(block))

/**
 * Identifies whether an address is contained in a restricted cidr block
 * @param address - the address to validate against restricted cidr blocks
 */
function isRestrictedIp(address: string): boolean {
  return CIDR_SUBNETS.some(subnet => subnet.contains(address))
}

/**
 * Validates a hostname during a dns lookup, throws if restricted
 * Modeled after `dns.lookup` method signature
 */
export function lookup(hostname: string, ...args: any[]): void {
  let [options, callback] = args
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  return dns.lookup(hostname, options, (err: NodeJS.ErrnoException | null, address: string | string[], family?: number) => {
    if (!err) {
      const addresses = Array.isArray(address) ? address : [address]
      const isRestricted = addresses.some(isRestrictedIp)

      if (isRestricted) {
        err = new Error(`"${hostname}" is a restricted hostname.`)
      }
    }

    callback(err, address, family)
  })
}

/**
 * A `got` `beforeRequest` hook that validates ips directly
 * because they don't use dns lookup
 */
export function beforeRequest(options: NormalizedOptions): void {
  const hostname = options.url.hostname

  if (net.isIP(hostname) && isRestrictedIp(hostname)) {
    throw new Error(`"${hostname}" is a restricted ip.`)
  }
}
