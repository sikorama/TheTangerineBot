import { Images, BotChannels, Settings, Stats, BotCommands } from '../../api/collections.js';
import { getParentId, genDataBlob } from '../tools.js';
import { checkUserRole } from '../../api/roles.js';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';

import './discord.html';