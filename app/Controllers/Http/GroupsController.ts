import BadRequest from 'App/Exceptions/BadRequestException'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Group from 'App/Models/Group'
import CreateGroup from 'App/Validators/CreateGroupValidator'

export default class GroupsController {
  public async index({ request, response }: HttpContextContract) {
    const { term, ['user']: userId } = request.qs()

    const groups = await this.filterByQueryString(userId, term)

    return response.ok({ groups })
  }

  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateGroup)
    const group = await Group.create(groupPayload)

    await group.related('players').attach([groupPayload.master])
    await group.load('players')

    return response.created({ group })
  }

  public async update({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id')
    const payload = request.all()
    const group = await Group.findOrFail(id)

    await bouncer.authorize('updateGroup', group)

    const updatedGroup = await group.merge(payload).save()

    return response.ok({ group: updatedGroup })
  }

  public async removePlayer({ request, response }: HttpContextContract) {
    const groupId = Number(request.param('groupId'))
    const playerId = Number(request.param('playerId'))

    const group = await Group.findOrFail(groupId)

    if (playerId === group.master) {
      throw new BadRequest('cannot remove master from group', 400)
    }

    await group.related('players').detach([playerId])

    return response.ok({})
  }

  public async destroy({ request, response, bouncer }: HttpContextContract) {
    const groupId = request.param('id')

    const group = await Group.findOrFail(groupId)

    await bouncer.authorize('deleteGroup', group)

    await group.delete()
    await group.related('players').detach()

    return response.ok({})
  }

  private filterByQueryString(userId: number, term: string) {
    if (userId && term) return this.filterByUserAndTerm(userId, term)
    else if (userId) return this.filterByUser(userId)
    else if (term) return this.filterByTerm(term)
    else return this.all()
  }

  private all() {
    return Group.query().preload('players').preload('masterUser')
  }

  private filterByUser(userId: number) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.withPlayer(userId))
  }

  private filterByTerm(term: string) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.withTerm(term))
  }

  private filterByUserAndTerm(userId: number, term: string) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.withPlayer(userId))
      .withScopes((scope) => scope.withTerm(term))
  }
}
