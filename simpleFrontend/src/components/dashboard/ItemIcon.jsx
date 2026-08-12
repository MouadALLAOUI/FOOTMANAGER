import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export const isFaIcon = (icon) => icon && typeof icon === 'object' && 'prefix' in icon && 'iconName' in icon

export default function ItemIcon({ icon: Icon, strokeWidth, ...rest }) {
  if (!Icon) return null
  return isFaIcon(Icon) ? <FontAwesomeIcon icon={Icon} {...rest} /> : <Icon strokeWidth={strokeWidth} {...rest} />
}
