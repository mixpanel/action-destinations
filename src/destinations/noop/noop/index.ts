import { Action } from '@/lib/destination-kit/action'

export default function(action: Action): Action {
  return action.do(() => console.log('Hello, world!'))
}
