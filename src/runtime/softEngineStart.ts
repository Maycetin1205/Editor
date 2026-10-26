import { installHost } from './host'
import { softEngineHost } from './softEngineHost'

// The first thing an exported mask runs: SoftEngine takes the place of the
// host. The editor never runs this and keeps the preview host.
installHost(softEngineHost)
