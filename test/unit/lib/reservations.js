process.env['DEBUG'] = 'nadia:*';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const should = require('chai').should();
const Reservation = require('../../../lib/schema/reservation');
const db = require('sqlite');

describe('Reservations Library', function() {
  const debugStub = function() {
    return sinon.stub();
  }
  let reservations;

  before(function() {
    reservations = proxyquire('../../../lib/reservations', {
      // Stub to disable debugger.
      debug: debugStub
    });
  });

  describe('Validate', function() {
    it('should pass a valid reservation with no optional fields', function() {
      const reservation = new Reservation({
        date: '2017/06/10',
        time: '06:02 AM',
        party: 4,
        name: 'Family',
        email: 'username@example.com'
      });

      return reservations.validate(reservation)
        .then(actual => actual.should.deep.equal(reservation));
    });

    it('should fail a reservation with a bad email', function() {
      const reservation = new Reservation({
        date: '2017/06/10',
        time: '06:02 AM',
        party: 4,
        name: 'Family',
        email: 'username'
      });

      return reservations.validate(reservation)
        .catch(error => error.should.be.an('error').and.not.be.null);
    });
  });

  describe('Create', function() {
    let dbStub;
    let validateSpy;

    before(function() {
      dbStub = sinon.stub(db, 'run').resolves({
        stmt: {
          lastID: 1349
        }
      });

      reservations = proxyquire('../../../lib/reservations', {
        debug: debugStub,
        sqlite: dbStub
      });
    });

    after(function() {
      db.run.restore();
    });

    it('should call the validator with a transformed reservation once', function(done) {
      const reservation = new Reservation({
        date: '2017/06/10',
        time: '06:02 AM',
        party: 4,
        name: 'Family',
        email: 'username@example.com'
      });

      validateSpy = sinon.spy(reservations, 'validate');

      reservations.create(reservation)
        .then(() => {
          validateSpy.calledOnce.should.be.ok;
          validateSpy.calledWith({
            datetime: '2017-06-10T06:02:00.000Z',
            party: 4,
            name: 'Family',
            email: 'username@example.com',
            message: undefined,
            phone: undefined,
          }).should.be.ok;
          validateSpy.restore();
          done();
        })
        .catch(error => done(error));
    });

    it('should return the created reservation ID', function(done) {
      const reservation = new Reservation({
        date: '2017/06/10',
        time: '06:02 AM',
        party: 4,
        name: 'Family',
        email: 'username@example.com'
      });
      reservations.create(reservation)
        .then(lastID => {
          lastID.should.deep.equal(1349);
          done();
        })
        .catch(error => done(error));
    });
  });

  describe('Save', function() {
    let dbMock;

    before(function() {
      dbMock = sinon.mock(db);
    });

    after(function() {
      dbMock.restore();
    });

    it('should only call the database once', function() {
      dbMock.expects('run')
        .once();

      reservations = proxyquire('../../../lib/reservations', {
        debug: debugStub,
        sqlite: dbMock
      });

      const reservation = {
        datetime: '2017-06-10T06:02:00.000Z',
        party: 4,
        name: 'Family',
        email: 'username@example.com',
        message: undefined,
        phone: undefined,
      };

      reservations.save(reservation);
      dbMock.verify();
    })
  });
});
